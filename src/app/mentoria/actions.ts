"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { requireRole } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { LINK_DAYS } from "@/lib/mentoria/dados";
import { INSTRUMENTS } from "@/lib/mentoria/instrumentos";
import { buildInviteEmail } from "@/lib/mentoria/mensagens";
import { parseItemLines } from "@/lib/mentoria/externo";
import { isInstrumentId } from "@/lib/mentoria/tipos";
import { createClient } from "@/lib/supabase/server";
import { generateInviteToken, hashToken } from "@/lib/tokens";

export type MentoriaState =
  | { error?: string; ok?: string; links?: { name: string; url: string }[]; message?: string }
  | undefined;

const uuid = z.string().uuid();

async function staffCtx(form: FormData) {
  const projectId = uuid.safeParse(form.get("projectId"));
  if (!projectId.success) return null;
  const access = await getProjectAccess(projectId.data);
  if (!access?.staff) return null;
  return { projectId: projectId.data, access, supabase: await createClient() };
}

function refresh(projectId: string) {
  for (const a of ["admin", "consultor", "cliente"]) revalidatePath(`/${a}/projetos/${projectId}/mentoria`, "layout");
}

function linkFor(token: string) {
  return `${publicEnv().NEXT_PUBLIC_SITE_URL}/avaliacao?token=${token}`;
}

function inviteMessage(name: string, links: { name: string; url: string }[]) {
  const first = name.trim().split(/\s+/)[0] || "Olá";
  const lines = [
    `Olá, ${first}! Preparei ${links.length === 1 ? "uma avaliação" : `${links.length} avaliações`} para a nossa mentoria na CEOEXPRESS.`,
    "Responda com calma, de preferência num momento tranquilo. Cada uma leva poucos minutos e pode ser feita pelo celular.",
    "",
    ...links.map((l) => `${l.name}: ${l.url}`),
    "",
    `Os links valem por ${LINK_DAYS} dias. Suas respostas são confidenciais e usadas só na mentoria.`,
  ];
  return lines.join("\n");
}

const createSchema = z.object({
  respondent_name: z.string().trim().min(2, "Informe o nome do mentorado.").max(200),
  respondent_email: z.string().trim().toLowerCase().email("E-mail inválido.").optional().or(z.literal("")).transform((v) => v || null),
  respondent_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
});

/** Cria uma aplicação (com link próprio) para cada avaliação marcada. */
export async function createApplications(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await staffCtx(form);
  if (!ctx) return { error: "Só a consultoria envia avaliações." };
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const instruments = form.getAll("instrument").map(String).filter(isInstrumentId);
  if (instruments.length === 0) return { error: "Marque ao menos uma avaliação." };

  if (parsed.data.respondent_id) {
    const { data: m } = await ctx.supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", ctx.projectId)
      .eq("user_id", parsed.data.respondent_id)
      .maybeSingle();
    if (!m) return { error: "A conta escolhida não faz parte deste projeto." };
  }

  const expires = new Date(Date.now() + LINK_DAYS * 86400_000).toISOString();
  const links: { name: string; url: string }[] = [];
  for (const id of instruments) {
    const token = generateInviteToken();
    const { error } = await ctx.supabase.from("assessment_applications").insert({
      project_id: ctx.projectId,
      instrument: id,
      instrument_version: INSTRUMENTS[id].version,
      source: "link",
      respondent_name: parsed.data.respondent_name,
      respondent_email: parsed.data.respondent_email,
      respondent_id: parsed.data.respondent_id,
      token_hash: hashToken(token),
      expires_at: expires,
      created_by: ctx.access.userId,
    });
    if (error) {
      console.error("createApplications", error.code, error.message);
      return { error: "Não foi possível criar as avaliações.", links };
    }
    links.push({ name: INSTRUMENTS[id].name, url: linkFor(token) });
  }

  let emailNote = "";
  if (form.get("send_email") === "on" && parsed.data.respondent_email) {
    if (!emailConfigured()) emailNote = " O e-mail não foi enviado porque o envio de e-mails não está configurado.";
    else {
      const ok = await sendEmail(parsed.data.respondent_email, buildInviteEmail(parsed.data.respondent_name, links));
      emailNote = ok ? ` E-mail enviado para ${parsed.data.respondent_email}.` : " O e-mail não pôde ser enviado; copie a mensagem abaixo.";
    }
  }

  refresh(ctx.projectId);
  return {
    ok: `${links.length === 1 ? "Avaliação criada" : `${links.length} avaliações criadas`}.${emailNote} Copie os links agora: por segurança, eles não ficam visíveis depois (dá para gerar um novo link a qualquer momento).`,
    links,
    message: inviteMessage(parsed.data.respondent_name, links),
  };
}

async function appCtx(form: FormData) {
  const ctx = await staffCtx(form);
  const appId = uuid.safeParse(form.get("appId"));
  if (!ctx || !appId.success) return null;
  const { data } = await ctx.supabase
    .from("assessment_applications")
    .select("id, instrument, status, source, respondent_name")
    .eq("id", appId.data)
    .eq("project_id", ctx.projectId)
    .maybeSingle();
  if (!data) return null;
  return { ...ctx, app: data as { id: string; instrument: string; status: string; source: string; respondent_name: string } };
}

/** Gera um link novo (o anterior deixa de funcionar) e renova a validade. */
export async function regenerateLink(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await appCtx(form);
  if (!ctx) return { error: "Avaliação não encontrada." };
  if (ctx.app.source !== "link") return { error: "Esta avaliação não é respondida por link." };
  if (ctx.app.status === "respondido") return { error: "Esta avaliação já foi respondida." };
  const token = generateInviteToken();
  const { error } = await ctx.supabase
    .from("assessment_applications")
    .update({
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + LINK_DAYS * 86400_000).toISOString(),
      status: ctx.app.status === "cancelado" ? "enviado" : ctx.app.status,
    })
    .eq("id", ctx.app.id);
  if (error) return { error: "Não foi possível gerar o link." };
  refresh(ctx.projectId);
  const name = isInstrumentId(ctx.app.instrument) ? INSTRUMENTS[ctx.app.instrument].name : "Avaliação";
  const links = [{ name, url: linkFor(token) }];
  return { ok: "Link novo gerado. O link anterior deixou de funcionar.", links, message: inviteMessage(ctx.app.respondent_name, links) };
}

export async function cancelApplication(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await appCtx(form);
  if (!ctx) return { error: "Avaliação não encontrada." };
  if (ctx.app.status === "respondido") return { error: "Avaliação já respondida não pode ser cancelada. Você pode excluí-la." };
  const { error } = await ctx.supabase.from("assessment_applications").update({ status: "cancelado", token_hash: null }).eq("id", ctx.app.id);
  if (error) return { error: "Não foi possível cancelar." };
  refresh(ctx.projectId);
  return { ok: "Avaliação cancelada. O link deixou de funcionar." };
}

export async function deleteApplication(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await appCtx(form);
  if (!ctx) return { error: "Avaliação não encontrada." };
  const { error } = await ctx.supabase.from("assessment_applications").delete().eq("id", ctx.app.id);
  if (error) return { error: "Não foi possível excluir." };
  refresh(ctx.projectId);
  redirect(`/${form.get("area") === "admin" ? "admin" : "consultor"}/projetos/${ctx.projectId}/mentoria`);
}

/** Comentário do mentor, conta do mentorado e liberação do relatório. */
export async function saveReview(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await appCtx(form);
  if (!ctx) return { error: "Avaliação não encontrada." };
  const comment = String(form.get("mentor_comment") ?? "").trim().slice(0, 20000) || null;
  const release = form.get("release") === "on";
  const respondent = String(form.get("respondent_id") ?? "");
  if (release && ctx.app.status !== "respondido") return { error: "Só dá para liberar depois que o mentorado responder." };

  let respondent_id: string | null = null;
  if (respondent) {
    if (!uuid.safeParse(respondent).success) return { error: "Conta inválida." };
    const { data: m } = await ctx.supabase.from("project_members").select("user_id").eq("project_id", ctx.projectId).eq("user_id", respondent).maybeSingle();
    if (!m) return { error: "A conta escolhida não faz parte deste projeto." };
    respondent_id = respondent;
  }
  if (release && !respondent_id) {
    return { error: "Para liberar no app, escolha a conta do mentorado. Sem conta, use \"Imprimir ou salvar PDF\" e envie o arquivo." };
  }

  const { data: cur } = await ctx.supabase.from("assessment_applications").select("released_at").eq("id", ctx.app.id).single();
  const { error } = await ctx.supabase
    .from("assessment_applications")
    .update({
      mentor_comment: comment,
      respondent_id,
      ...(release
        ? cur?.released_at
          ? {}
          : { released_at: new Date().toISOString(), released_by: ctx.access.userId }
        : { released_at: null, released_by: null }),
    })
    .eq("id", ctx.app.id);
  if (error) return { error: "Não foi possível salvar." };
  refresh(ctx.projectId);
  return { ok: release ? "Salvo e liberado para o mentorado." : "Salvo. O relatório continua visível só para a consultoria." };
}

// ---------------------------------------------------------------------------
// Testes externos e notas antigas
// ---------------------------------------------------------------------------

const externalSchema = z.object({
  title: z.string().trim().min(2, "Informe o nome do teste.").max(200),
  respondent_name: z.string().trim().min(2, "Informe o nome do mentorado.").max(200),
  applied_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do teste."),
  principal_rotulo: z.string().trim().max(120).optional().transform((v) => v || null),
  principal_valor: z.string().optional().transform((v) => (v ? Number(v.replace(",", ".")) : null)),
  principal_maximo: z.string().optional().transform((v) => (v ? Number(v.replace(",", ".")) : 100)),
  link: z.string().trim().url("Link inválido.").max(500).optional().or(z.literal("")).transform((v) => v || null),
  respondent_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
});

export async function createExternal(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await staffCtx(form);
  if (!ctx) return { error: "Só a consultoria registra testes." };
  const parsed = externalSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const d = parsed.data;
  if (d.principal_valor !== null && (!Number.isFinite(d.principal_valor) || !Number.isFinite(d.principal_maximo) || d.principal_maximo <= 0)) {
    return { error: "Confira a nota principal e o máximo." };
  }
  const itens = parseItemLines(String(form.get("itens") ?? ""));
  if (typeof itens === "string") return { error: itens };
  if (d.principal_valor === null && itens.length === 0) return { error: "Informe a nota principal ou ao menos um item." };

  const { error } = await ctx.supabase.from("assessment_applications").insert({
    project_id: ctx.projectId,
    instrument: "externo",
    source: "externo",
    title: d.title,
    respondent_name: d.respondent_name,
    respondent_id: d.respondent_id,
    status: "respondido",
    applied_on: d.applied_on,
    submitted_at: new Date().toISOString(),
    external: {
      principal: d.principal_valor !== null ? { rotulo: d.principal_rotulo ?? "Nota", valor: d.principal_valor, maximo: d.principal_maximo } : null,
      itens,
      link: d.link,
    },
    created_by: ctx.access.userId,
  });
  if (error) {
    console.error("createExternal", error.code, error.message);
    return { error: "Não foi possível registrar o teste." };
  }
  refresh(ctx.projectId);
  return { ok: `Teste "${d.title}" registrado no histórico.` };
}

/**
 * Notas antigas (por exemplo, de outra ferramenta) digitadas por dimensão,
 * de 0 a 10, para a evolução já começar com histórico.
 */
export async function importScores(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  const ctx = await staffCtx(form);
  if (!ctx) return { error: "Só a consultoria registra notas." };
  const instrument = String(form.get("instrument") ?? "");
  if (!isInstrumentId(instrument)) return { error: "Escolha a avaliação." };
  const name = z.string().trim().min(2).max(200).safeParse(form.get("respondent_name"));
  if (!name.success) return { error: "Informe o nome do mentorado." };
  const date = String(form.get("applied_on") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Informe a data em que o teste foi feito." };
  const instr = INSTRUMENTS[instrument];
  const dims: { id: string; label: string; score: number }[] = [];
  for (const d of instr.dimensions) {
    const raw = String(form.get(`dim_${d.id}`) ?? "").replace(",", ".").trim();
    if (!raw) continue;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0 || v > 10) return { error: `A nota de "${d.label}" precisa ficar entre 0 e 10.` };
    dims.push({ id: d.id, label: d.label, score: Math.round(v * 10) / 10 });
  }
  if (dims.length === 0) return { error: "Informe a nota de ao menos uma dimensão." };
  const overall = Math.round((dims.reduce((a, b) => a + b.score, 0) / dims.length) * 10) / 10;
  const respondent = String(form.get("respondent_id") ?? "");
  const { error } = await ctx.supabase.from("assessment_applications").insert({
    project_id: ctx.projectId,
    instrument,
    instrument_version: instr.version,
    source: "importado",
    title: String(form.get("title") ?? "").trim().slice(0, 200) || null,
    respondent_name: name.data,
    respondent_id: uuid.safeParse(respondent).success ? respondent : null,
    status: "respondido",
    applied_on: date,
    submitted_at: new Date().toISOString(),
    scores: { version: instr.version, dims, overall },
    created_by: ctx.access.userId,
  });
  if (error) {
    console.error("importScores", error.code, error.message);
    return { error: "Não foi possível registrar as notas." };
  }
  refresh(ctx.projectId);
  return { ok: "Notas antigas registradas. Elas entram na comparação das próximas aplicações." };
}

// ---------------------------------------------------------------------------
// Biblioteca (administrador)
// ---------------------------------------------------------------------------

const libSchema = z.object({
  kind: z.enum(["livro", "filme"]),
  title: z.string().trim().min(1, "Informe o título.").max(300),
  author: z.string().trim().max(300).optional().transform((v) => v || null),
  year: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 1000 && v <= 2100), "Ano inválido."),
  note: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export async function saveLibraryItem(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  await requireRole("admin");
  const parsed = libSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const tags = form.getAll("tags").map(String).filter((t) => /^[a-z_]+:[a-z_]+$/.test(t)).slice(0, 30);
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const row = { ...parsed.data, tags, active: form.getAll("active").includes("on") };
  const { error } = uuid.safeParse(id).success
    ? await supabase.from("mentoring_library").update(row).eq("id", id)
    : await supabase.from("mentoring_library").insert(row);
  if (error) return { error: error.code === "23505" ? "Já existe um item com este título." : "Não foi possível salvar." };
  revalidatePath("/admin/biblioteca");
  return { ok: `"${parsed.data.title}" salvo.` };
}

export async function deleteLibraryItem(_: MentoriaState, form: FormData): Promise<MentoriaState> {
  await requireRole("admin");
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return { error: "Item inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("mentoring_library").delete().eq("id", id.data);
  if (error) return { error: "Não foi possível excluir." };
  revalidatePath("/admin/biblioteca");
  redirect("/admin/biblioteca");
}
