"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  contractDataSchema,
  documentoContratante,
  nomeContratante,
  pendenciasParaGerar,
  montarTexto,
  valoresDosCampos,
} from "@/lib/contratos/dados";
import { contractPdf } from "@/lib/contratos/pdf";
import { getContract, getSettings } from "@/lib/contratos/servidor";
import { createClient } from "@/lib/supabase/server";

/** Contratos: configurações, modelos e o ciclo do contrato (rascunho → PDF → assinatura). Só administrador. */

export type FormResult = { error?: string; ok?: string; pendencias?: string[] } | undefined;

const uuid = z.string().uuid();
const BASE = "/admin/contratos";

function refresh(id?: string) {
  revalidatePath(BASE, "layout");
  if (id) revalidatePath(`${BASE}/${id}`);
  revalidatePath("/cliente/contratos");
}

async function admin() {
  await requireRole("admin");
  return createClient();
}

// ---------------------------------------------------------------------------
// Configurações (dados da contratada)
// ---------------------------------------------------------------------------
const settingsSchema = z.object({
  provider_name: z.string().trim().min(2, "Informe o nome da contratada.").max(200),
  provider_document: z.string().trim().max(40),
  provider_qualification: z.string().trim().min(20, "Escreva a qualificação completa da contratada.").max(2000),
  payment_instructions: z.string().trim().max(600),
  default_city: z.string().trim().max(120),
  default_forum: z.string().trim().max(120),
});

export async function saveSettings(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(Object.keys(settingsSchema.shape).map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const { error } = await supabase.from("contract_settings").upsert({ id: true, ...parsed.data });
  if (error) return { error: "Não foi possível salvar as configurações." };
  refresh();
  return { ok: "Configurações salvas. Elas entram nos próximos contratos gerados." };
}

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------
const templateSchema = z.object({
  title: z.string().trim().min(3, "Informe o nome do modelo.").max(200),
  description: z.string().trim().max(1000).transform((v) => v || null),
  body: z.string().trim().min(10, "Escreva o texto do modelo.").max(100000),
  active: z.boolean(),
});

export async function saveTemplate(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const parsed = templateSchema.safeParse({
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    body: String(form.get("body") ?? ""),
    active: form.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const id = uuid.safeParse(form.get("templateId"));
  if (id.success) {
    const { error } = await supabase.from("contract_templates").update(parsed.data).eq("id", id.data);
    if (error) return { error: "Não foi possível salvar o modelo." };
  } else {
    const { error } = await supabase.from("contract_templates").insert(parsed.data);
    if (error) return { error: "Não foi possível criar o modelo." };
  }
  refresh();
  redirect(`${BASE}/modelos`);
}

export async function deleteTemplate(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const id = uuid.safeParse(form.get("templateId"));
  if (!id.success) return { error: "Modelo não encontrado." };
  const { error } = await supabase.from("contract_templates").delete().eq("id", id.data);
  if (error) return { error: "Não foi possível excluir o modelo." };
  refresh();
  redirect(`${BASE}/modelos`);
}

// ---------------------------------------------------------------------------
// Contrato: salvar dados
// ---------------------------------------------------------------------------
function dataFrom(form: FormData) {
  const raw: Record<string, unknown> = {};
  for (const k of Object.keys(contractDataSchema.shape)) raw[k] = form.get(k) ?? "";
  raw.testemunhas = form.get("testemunhas") === "on";
  return contractDataSchema.parse(raw);
}

async function nextContractCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  const year = new Date().getFullYear();
  const { data } = await supabase.from("contracts").select("code").like("code", `CT-${year}-%`);
  const max = (data ?? []).reduce((m, r) => {
    const n = /^CT-\d{4}-(\d+)$/.exec(r.code);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `CT-${year}-${String(max + 1).padStart(3, "0")}`;
}

export async function saveContract(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const user = await requireRole("admin");
  const data = dataFrom(form);
  const party = nomeContratante(data);
  if (!party) return { error: data.tipo === "pf" ? "Informe o nome do contratante." : "Informe a razão social do contratante." };
  const companyId = uuid.safeParse(form.get("company_id"));
  const templateId = uuid.safeParse(form.get("template_id"));
  const title = `${data.servico || "Prestação de serviços"} – ${party}`.slice(0, 200);
  const row = {
    data,
    party_name: party.slice(0, 200),
    title,
    company_id: companyId.success ? companyId.data : null,
    template_id: templateId.success ? templateId.data : null,
  };

  const id = uuid.safeParse(form.get("contractId"));
  if (id.success) {
    const current = await getContract(id.data);
    if (!current) return { error: "Contrato não encontrado." };
    if (current.status === "assinado" || current.status === "cancelado") return { error: "Contrato assinado ou cancelado não pode ser editado." };
    // Mudou os dados: o PDF anterior deixa de valer e o contrato volta a rascunho.
    const { error } = await supabase
      .from("contracts")
      .update({ ...row, status: "rascunho", body: null, pdf_path: null, pdf_sha256: null, generated_at: null, sent_at: null })
      .eq("id", id.data);
    if (error) return { error: "Não foi possível salvar o contrato." };
    refresh(id.data);
    redirect(`${BASE}/${id.data}`);
  }

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const code = await nextContractCode(supabase);
    const { data: created, error } = await supabase
      .from("contracts")
      .insert({ ...row, code, created_by: user.id })
      .select("id")
      .single();
    if (!error && created) {
      refresh(created.id);
      redirect(`${BASE}/${created.id}`);
    }
    if (error?.code !== "23505") return { error: "Não foi possível criar o contrato." };
  }
  return { error: "Não foi possível numerar o contrato. Tente de novo." };
}

// ---------------------------------------------------------------------------
// Gerar o PDF
// ---------------------------------------------------------------------------
export async function generatePdf(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const id = uuid.safeParse(form.get("contractId"));
  if (!id.success) return { error: "Contrato não encontrado." };
  const c = await getContract(id.data);
  if (!c) return { error: "Contrato não encontrado." };
  if (c.status !== "rascunho" && c.status !== "gerado") return { error: "Este contrato já foi enviado ou assinado. Para mudar, edite os dados primeiro." };
  if (!c.template_id) return { error: "Escolha um modelo de contrato (em Editar dados)." };
  const [settings, tpl] = await Promise.all([
    getSettings(),
    supabase.from("contract_templates").select("body").eq("id", c.template_id).maybeSingle(),
  ]);
  if (!tpl.data) return { error: "O modelo deste contrato não existe mais. Escolha outro em Editar dados." };

  const pend = pendenciasParaGerar(c.data, settings);
  if (pend.length) return { error: "Faltam informações para gerar o PDF:", pendencias: pend };

  const { texto, faltando } = montarTexto(tpl.data.body, valoresDosCampos(c.data, settings));
  if (faltando.length) {
    return { error: "O modelo usa campos que ficaram vazios ou não existem:", pendencias: faltando.map((f) => `{{${f}}}`) };
  }

  const now = new Date();
  const bytes = await contractPdf(
    texto,
    {
      contratada: { nome: settings.provider_name, documento: settings.provider_document },
      contratante: { nome: nomeContratante(c.data), documento: documentoContratante(c.data) },
      testemunhas: c.data.testemunhas,
    },
    { title: c.title, code: c.code, createdAt: now },
  );
  const sha = createHash("sha256").update(bytes).digest("hex");
  const path = `${c.id}/${c.code}-${now.getTime()}.pdf`;
  const up = await supabase.storage.from("contratos").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up.error) return { error: "Não foi possível guardar o PDF. Tente de novo." };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "gerado", body: texto, pdf_path: path, pdf_sha256: sha, generated_at: now.toISOString() })
    .eq("id", c.id);
  if (error) return { error: "O PDF foi criado, mas não foi possível atualizar o contrato." };
  refresh(c.id);
  return { ok: "PDF gerado. Baixe e envie ao cliente para assinar no gov.br." };
}

// ---------------------------------------------------------------------------
// Andamento: enviado, assinado, cancelado, liberar ao cliente, excluir
// ---------------------------------------------------------------------------
async function setFields(form: FormData, patch: Record<string, unknown>, allowed: string[], msg: string): Promise<FormResult> {
  const supabase = await admin();
  const id = uuid.safeParse(form.get("contractId"));
  if (!id.success) return { error: "Contrato não encontrado." };
  const { data, error } = await supabase
    .from("contracts")
    .update(patch)
    .eq("id", id.data)
    .in("status", allowed)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível atualizar o contrato." };
  refresh(id.data);
  return { ok: msg };
}

export async function markSent(_: FormResult, form: FormData): Promise<FormResult> {
  return setFields(form, { status: "enviado", sent_at: new Date().toISOString() }, ["gerado"], "Marcado como enviado para assinatura.");
}

export async function cancelContract(_: FormResult, form: FormData): Promise<FormResult> {
  return setFields(form, { status: "cancelado" }, ["rascunho", "gerado", "enviado"], "Contrato cancelado.");
}

export async function setClientVisible(_: FormResult, form: FormData): Promise<FormResult> {
  const visible = form.get("visible") === "1";
  const supabase = await admin();
  const id = uuid.safeParse(form.get("contractId"));
  if (!id.success) return { error: "Contrato não encontrado." };
  const c = await getContract(id.data);
  if (!c) return { error: "Contrato não encontrado." };
  if (visible && !c.company_id) return { error: "Ligue o contrato a uma empresa cliente (em Empresa no app) para o cliente poder vê-lo." };
  const { error } = await supabase.from("contracts").update({ client_visible: visible }).eq("id", c.id);
  if (error) return { error: "Não foi possível atualizar." };
  refresh(c.id);
  return { ok: visible ? "O cliente já vê este contrato na área dele." : "O contrato não aparece mais para o cliente." };
}

export async function linkCompany(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const id = uuid.safeParse(form.get("contractId"));
  const company = uuid.safeParse(form.get("company_id"));
  if (!id.success) return { error: "Contrato não encontrado." };
  const { error } = await supabase
    .from("contracts")
    .update({ company_id: company.success ? company.data : null, ...(company.success ? {} : { client_visible: false }) })
    .eq("id", id.data);
  if (error) return { error: "Não foi possível ligar a empresa." };
  refresh(id.data);
  return { ok: "Empresa atualizada." };
}

export async function deleteContract(_: FormResult, form: FormData): Promise<FormResult> {
  const supabase = await admin();
  const id = uuid.safeParse(form.get("contractId"));
  if (!id.success) return { error: "Contrato não encontrado." };
  const { data, error } = await supabase.from("contracts").delete().eq("id", id.data).is("signed_path", null).select("id");
  if (error || !data?.length) return { error: "Não foi possível excluir. Contrato assinado não pode ser excluído." };
  refresh();
  redirect(BASE);
}

/** Depois que o navegador enviou o PDF assinado ao armazenamento. */
export async function finalizeSigned(input: { contractId: string; path: string; fileName: string; sha256: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await admin();
  const id = uuid.safeParse(input.contractId);
  if (!id.success || !input.path.startsWith(`${input.contractId}/assinado-`) || !/^[0-9a-f]{64}$/.test(input.sha256)) {
    return { ok: false, error: "Envio inválido." };
  }
  const c = await getContract(id.data);
  if (!c) return { ok: false, error: "Contrato não encontrado." };
  if (c.status !== "gerado" && c.status !== "enviado") return { ok: false, error: "Gere o PDF do contrato antes de subir a versão assinada." };
  const { error } = await supabase
    .from("contracts")
    .update({
      status: "assinado",
      signed_path: input.path,
      signed_file_name: input.fileName.slice(0, 200),
      signed_sha256: input.sha256,
      signed_at: new Date().toISOString(),
      sent_at: c.sent_at ?? new Date().toISOString(),
    })
    .eq("id", c.id);
  if (error) return { ok: false, error: "O arquivo foi enviado, mas não foi possível marcar o contrato como assinado." };
  refresh(c.id);
  return { ok: true };
}
