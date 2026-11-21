"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { requireRole } from "@/lib/auth";
import { parseChecklist, parseFormats } from "@/lib/checklist";
import { createClient } from "@/lib/supabase/server";

/**
 * Cadastro de pedidos e ações pela consultoria (incluir, editar, excluir),
 * biblioteca de modelos (admin) e aplicação de modelos a um projeto.
 */

export type FormResult = { error?: string; ok?: string } | undefined;

const uuid = z.string().uuid();
const optText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().catch(null);
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null);

function areaOf(form: FormData): "admin" | "consultor" {
  return form.get("area") === "admin" ? "admin" : "consultor";
}

function refreshProject(projectId: string) {
  for (const area of ["admin", "consultor", "cliente"]) revalidatePath(`/${area}/projetos/${projectId}`, "layout");
  revalidatePath("/admin");
  revalidatePath("/consultor");
}

async function staffContext(form: FormData) {
  const projectId = uuid.safeParse(form.get("projectId"));
  if (!projectId.success) return null;
  const access = await getProjectAccess(projectId.data);
  if (!access?.staff) return null;
  return { projectId: projectId.data, access, supabase: await createClient() };
}

/** Campos comuns a pedido e modelo de pedido. */
const requestFields = z.object({
  code: z.string().trim().min(1, "Informe o código (ex.: D17).").max(20),
  title: z.string().trim().min(3, "Informe o título do pedido.").max(300),
  category: z.string().trim().max(120).transform((v) => v || "Outros"),
  stage: optText(60),
  description: optText(4000),
  purpose: optText(4000),
  minimum_content: optText(4000),
  examples: optText(4000),
  instructions: optText(4000),
  checklist: z.string().max(40000).catch("").transform(parseChecklist),
  accepted_formats: z.string().max(300).catch("").transform(parseFormats),
});

function fieldsFrom(form: FormData) {
  return requestFields.safeParse({
    code: form.get("code") ?? "",
    title: form.get("title") ?? "",
    category: form.get("category") ?? "",
    stage: form.get("stage"),
    description: form.get("description"),
    purpose: form.get("purpose"),
    minimum_content: form.get("minimum_content"),
    examples: form.get("examples"),
    instructions: form.get("instructions"),
    checklist: form.get("checklist") ?? "",
    accepted_formats: form.get("accepted_formats") ?? "",
  });
}

// ---------------------------------------------------------------------------
// Pedidos de informação do projeto
// ---------------------------------------------------------------------------
export async function saveRequest(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  if (!ctx) return { error: "Só a consultoria cadastra pedidos." };
  const parsed = fieldsFrom(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const requestId = uuid.safeParse(form.get("requestId"));
  const extra = {
    owner_label: optText(200).parse(form.get("owner_label")),
    due_on: optDate.parse(form.get("due_on") || null),
    visibility: form.get("internal") === "on" ? "internal" : "client",
  };

  let id = requestId.success ? requestId.data : null;
  if (id) {
    const { error } = await ctx.supabase
      .from("info_requests")
      .update({ ...parsed.data, ...extra })
      .eq("id", id)
      .eq("project_id", ctx.projectId);
    if (error) return { error: error.code === "23505" ? "Já existe um pedido com este código no projeto." : "Não foi possível salvar o pedido." };
  } else {
    const { data: last } = await ctx.supabase
      .from("info_requests")
      .select("sort_order")
      .eq("project_id", ctx.projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await ctx.supabase
      .from("info_requests")
      .insert({ ...parsed.data, ...extra, project_id: ctx.projectId, sort_order: (last?.sort_order ?? -1) + 1, created_by: ctx.access.userId })
      .select("id")
      .single();
    if (error || !data) return { error: error?.code === "23505" ? "Já existe um pedido com este código no projeto." : "Não foi possível criar o pedido." };
    id = data.id;
  }
  refreshProject(ctx.projectId);
  redirect(`/${areaOf(form)}/projetos/${ctx.projectId}/pedidos/${id}`);
}

export async function deleteRequest(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  const requestId = uuid.safeParse(form.get("requestId"));
  if (!ctx || !requestId.success) return { error: "Só a consultoria exclui pedidos." };
  const { data, error } = await ctx.supabase
    .from("info_requests")
    .delete()
    .eq("id", requestId.data)
    .eq("project_id", ctx.projectId)
    .select("id");
  if (error) {
    return {
      error: error.message.includes("arquivos enviados")
        ? "Este pedido já tem arquivos enviados. Marque como \"Não aplicável\" em vez de excluir."
        : "Não foi possível excluir o pedido.",
    };
  }
  if (!data?.length) return { error: "Pedido não encontrado." };
  refreshProject(ctx.projectId);
  redirect(`/${areaOf(form)}/projetos/${ctx.projectId}`);
}

// ---------------------------------------------------------------------------
// Ações do plano
// ---------------------------------------------------------------------------
export async function deleteAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  const actionId = uuid.safeParse(form.get("actionId"));
  if (!ctx || !actionId.success) return { error: "Só a consultoria exclui ações." };
  const { data, error } = await ctx.supabase
    .from("action_items")
    .delete()
    .eq("id", actionId.data)
    .eq("project_id", ctx.projectId)
    .select("id");
  if (error) {
    return {
      error: error.message.includes("dependem desta")
        ? "Outras ações dependem desta. Tire a dependência nelas primeiro, ou marque esta como \"Cancelada\"."
        : "Não foi possível excluir a ação.",
    };
  }
  if (!data?.length) return { error: "Ação não encontrada." };
  refreshProject(ctx.projectId);
  redirect(`/${areaOf(form)}/projetos/${ctx.projectId}/plano`);
}

// ---------------------------------------------------------------------------
// Aplicar modelos a um projeto
// ---------------------------------------------------------------------------
export async function applyTemplates(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  if (!ctx) return { error: "Só a consultoria monta o projeto." };
  const reqIds = form.getAll("req").filter((v): v is string => typeof v === "string" && uuid.safeParse(v).success).slice(0, 300);
  const actIds = form.getAll("act").filter((v): v is string => typeof v === "string" && uuid.safeParse(v).success).slice(0, 300);
  if (!reqIds.length && !actIds.length) return { error: "Marque pelo menos um pedido ou uma ação." };
  const { supabase, projectId } = ctx;

  const [existingReq, existingAct, lastReq] = await Promise.all([
    supabase.from("info_requests").select("code").eq("project_id", projectId),
    supabase.from("action_items").select("code").eq("project_id", projectId),
    supabase.from("info_requests").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const reqCodes = new Set((existingReq.data ?? []).map((r) => r.code));
  const actCodes = new Set((existingAct.data ?? []).map((a) => a.code).filter(Boolean));
  let skipped = 0;
  let createdReq = 0;
  let createdAct = 0;

  if (reqIds.length) {
    const { data: tpl } = await supabase
      .from("request_templates")
      .select("code, title, category, stage, description, purpose, minimum_content, examples, accepted_formats, instructions, checklist, sort_order")
      .in("id", reqIds)
      .order("sort_order");
    let order = (lastReq.data?.sort_order ?? -1) + 1;
    const rows = (tpl ?? []).filter((t) => (reqCodes.has(t.code) ? (skipped++, false) : true))
      .map((t) => ({ ...t, sort_order: order++, project_id: projectId, created_by: ctx.access.userId }));
    if (rows.length) {
      const { error } = await supabase.from("info_requests").insert(rows);
      if (error) return { error: "Não foi possível criar os pedidos. Nada foi alterado." };
      createdReq = rows.length;
    }
  }

  if (actIds.length) {
    const { data: tpl } = await supabase
      .from("action_templates")
      .select("code, kind, title, rationale, area, how, priority, decision_inputs, resources, expected_evidence, completion_criteria, basis")
      .in("id", actIds)
      .order("sort_order");
    const rows = (tpl ?? []).filter((t) => (actCodes.has(t.code) ? (skipped++, false) : true))
      .map((t) => ({ ...t, project_id: projectId, created_by: ctx.access.userId }));
    if (rows.length) {
      const { error } = await supabase.from("action_items").insert(rows);
      if (error) {
        refreshProject(projectId);
        return { error: `${createdReq ? `${createdReq} pedido(s) criado(s), mas ` : ""}não foi possível criar as ações.` };
      }
      createdAct = rows.length;
    }
  }

  refreshProject(projectId);
  const parts = [];
  if (createdReq) parts.push(`${createdReq} pedido(s)`);
  if (createdAct) parts.push(`${createdAct} ação(ões)`);
  const created = parts.length ? `Criados: ${parts.join(" e ")}.` : "Nada novo criado.";
  return { ok: `${created}${skipped ? ` ${skipped} já existiam no projeto com o mesmo código e foram mantidos.` : ""}` };
}

// ---------------------------------------------------------------------------
// Biblioteca de modelos (somente admin)
// ---------------------------------------------------------------------------
function refreshLibrary() {
  revalidatePath("/admin/modelos", "layout");
}

export async function saveRequestTemplate(_: FormResult, form: FormData): Promise<FormResult> {
  await requireRole("admin");
  const parsed = fieldsFrom(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const id = uuid.safeParse(form.get("templateId"));
  const row = { ...parsed.data, active: form.get("active") !== "off" };
  const supabase = await createClient();
  const { error } = id.success
    ? await supabase.from("request_templates").update(row).eq("id", id.data)
    : await supabase.from("request_templates").insert(row);
  if (error) return { error: error.code === "23505" ? "Já existe um modelo com este código." : "Não foi possível salvar o modelo." };
  refreshLibrary();
  redirect("/admin/modelos");
}

const actionTemplate = z.object({
  code: z.string().trim().min(1, "Informe o código (ex.: A40).").max(20),
  kind: z.enum(["tarefa", "pendencia", "acao_5w2h"]).catch("acao_5w2h"),
  title: z.string().trim().min(3, "Diga o que precisa ser realizado.").max(300),
  rationale: optText(4000),
  area: optText(300),
  how: optText(4000),
  priority: z.enum(["baixa", "media", "alta", "critica"]).catch("media"),
  decision_inputs: optText(4000),
  resources: optText(2000),
  expected_evidence: optText(4000),
  completion_criteria: optText(4000),
  basis: optText(1000),
});

export async function saveActionTemplate(_: FormResult, form: FormData): Promise<FormResult> {
  await requireRole("admin");
  const parsed = actionTemplate.safeParse({
    code: form.get("code") ?? "",
    kind: form.get("kind"),
    title: form.get("title") ?? "",
    rationale: form.get("rationale"),
    area: form.get("area"),
    how: form.get("how"),
    priority: form.get("priority"),
    decision_inputs: form.get("decision_inputs"),
    resources: form.get("resources"),
    expected_evidence: form.get("expected_evidence"),
    completion_criteria: form.get("completion_criteria"),
    basis: form.get("basis"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const id = uuid.safeParse(form.get("templateId"));
  const row = { ...parsed.data, active: form.get("active") !== "off" };
  const supabase = await createClient();
  const { error } = id.success
    ? await supabase.from("action_templates").update(row).eq("id", id.data)
    : await supabase.from("action_templates").insert(row);
  if (error) return { error: error.code === "23505" ? "Já existe um modelo com este código." : "Não foi possível salvar o modelo." };
  refreshLibrary();
  redirect("/admin/modelos");
}

export async function deleteTemplate(_: FormResult, form: FormData): Promise<FormResult> {
  await requireRole("admin");
  const id = uuid.safeParse(form.get("templateId"));
  const table = form.get("tipo") === "acao" ? "action_templates" : "request_templates";
  if (!id.success) return { error: "Modelo inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id.data);
  if (error) return { error: "Não foi possível excluir o modelo." };
  refreshLibrary();
  redirect("/admin/modelos");
}

export async function importTemplates(_: FormResult, form: FormData): Promise<FormResult> {
  await requireRole("admin");
  const projectId = uuid.safeParse(form.get("projectId"));
  if (!projectId.success) return { error: "Escolha um projeto." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_templates_from_project", { p_project: projectId.data });
  if (error) return { error: "Não foi possível importar." };
  const r = (Array.isArray(data) ? data[0] : data) as { requests: number; actions: number } | undefined;
  refreshLibrary();
  return { ok: `Importados ${r?.requests ?? 0} pedido(s) e ${r?.actions ?? 0} ação(ões). Códigos que já estavam na biblioteca foram mantidos.` };
}
