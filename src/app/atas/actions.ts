"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { minutesText, normalizeMinutes, type MinutesContent } from "@/lib/atas/conteudo";
import { ATTACHMENT_EXTS } from "@/lib/atas/arquivo-regras";
import { maskPersonalData } from "@/lib/atas/privacidade";
import { nextCode } from "@/lib/codigos";
import { formatDate } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { contentTypeFor, safeFileName, validateUpload } from "@/lib/upload";

export type MinutesResult = { error?: string; ok?: string } | undefined;

const uuid = z.string().uuid();
const BUCKET = "documentos";

function refresh(projectId: string) {
  for (const a of ["admin", "consultor", "cliente"]) revalidatePath(`/${a}/projetos/${projectId}`, "layout");
}

function savedAt() {
  return new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

async function context(projectId: unknown, meetingId: unknown) {
  const p = uuid.safeParse(projectId);
  const m = uuid.safeParse(meetingId);
  if (!p.success || !m.success) return null;
  const access = await getProjectAccess(p.data);
  if (!access?.staff) return null;
  const supabase = await createClient();
  const [{ data: meeting }, { data: minutes }] = await Promise.all([
    supabase.from("meetings").select("id, company_id, title, scheduled_on, visibility").eq("id", m.data).eq("project_id", p.data).maybeSingle(),
    supabase
      .from("meeting_minutes")
      .select("id, content, status, attachment_document_id")
      .eq("meeting_id", m.data)
      .eq("project_id", p.data)
      .maybeSingle(),
  ]);
  if (!meeting) return null;
  return { supabase, access, projectId: p.data, meetingId: m.data, meeting, minutes };
}

/** O anexo acompanha a ata: o cliente só baixa depois de revisada e se o encontro não for interno. */
async function syncAttachment(
  ctx: NonNullable<Awaited<ReturnType<typeof context>>>,
  documentId: string | null,
  reviewed: boolean,
) {
  if (!documentId) return;
  await ctx.supabase
    .from("documents")
    .update({ visibility: reviewed && ctx.meeting.visibility === "client" ? "client" : "internal" })
    .eq("id", documentId)
    .eq("project_id", ctx.projectId);
}

export async function saveMinutes(_: MinutesResult, form: FormData): Promise<MinutesResult> {
  const ctx = await context(form.get("projectId"), form.get("meetingId"));
  if (!ctx) return { error: "Só a consultoria edita atas." };
  if (!ctx.minutes) return { error: "Ata não encontrada. Atualize a página." };
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("content") ?? "{}"));
  } catch {
    return { error: "Não foi possível ler a ata. Tente de novo." };
  }
  const content = normalizeMinutes(raw);
  // Dados pessoais digitados por engano (CPF, e-mail, telefone) não ficam na ata.
  const masked = normalizeMinutes(JSON.parse(maskPersonalData(JSON.stringify(content))));
  const reviewed = form.get("revisada") === "on";

  const { error } = await ctx.supabase
    .from("meeting_minutes")
    .update({
      content: masked,
      status: reviewed ? "revisada" : "rascunho",
      ...(reviewed && ctx.minutes.status !== "revisada" ? { reviewed_by: ctx.access.userId, reviewed_at: new Date().toISOString() } : {}),
      ...(!reviewed ? { reviewed_by: null, reviewed_at: null } : {}),
    })
    .eq("id", ctx.minutes.id);
  if (error) return { error: "Não foi possível salvar a ata." };

  // A ata revisada vira o texto do encontro (aparece na agenda e nas exportações).
  await ctx.supabase
    .from("meetings")
    .update(reviewed ? { minutes: minutesText(masked), held: true } : { minutes: null })
    .eq("id", ctx.meetingId)
    .eq("project_id", ctx.projectId);
  await syncAttachment(ctx, ctx.minutes.attachment_document_id, reviewed);

  refresh(ctx.projectId);
  return { ok: reviewed ? `Ata revisada e salva às ${savedAt()}.` : `Rascunho salvo às ${savedAt()}.` };
}

export async function deleteMinutes(_: MinutesResult, form: FormData): Promise<MinutesResult> {
  const ctx = await context(form.get("projectId"), form.get("meetingId"));
  if (!ctx?.minutes) return { error: "Só a consultoria exclui atas." };
  const { error } = await ctx.supabase.from("meeting_minutes").delete().eq("id", ctx.minutes.id);
  if (error) return { error: "Não foi possível excluir a ata." };
  await ctx.supabase.from("meetings").update({ minutes: null }).eq("id", ctx.meetingId);
  await syncAttachment(ctx, ctx.minutes.attachment_document_id, false);
  refresh(ctx.projectId);
  redirect(`/${form.get("area") === "admin" ? "admin" : "consultor"}/projetos/${ctx.projectId}/agenda/${ctx.meetingId}/ata`);
}

function sameName(a: string, b: string): boolean {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const x = n(a);
  const y = n(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // "Ana" combina com "Ana Souza" quando só há uma Ana no projeto (conferido por quem chama).
  return y.split(/\s+/)[0] === x || x.split(/\s+/)[0] === y;
}

/** Encaminhamentos marcados viram ações do plano (AP-..), uma por item. */
export async function sendTasksToPlan(_: MinutesResult, form: FormData): Promise<MinutesResult> {
  const ctx = await context(form.get("projectId"), form.get("meetingId"));
  if (!ctx?.minutes) return { error: "Só a consultoria leva encaminhamentos ao plano." };
  const content = normalizeMinutes(ctx.minutes.content) as MinutesContent;
  const picked = new Set(form.getAll("item").map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < content.encaminhamentos.length));
  const todo = [...picked].filter((i) => !content.encaminhamentos[i].action_id);
  if (todo.length === 0) return { error: "Marque ao menos um encaminhamento que ainda não esteja no plano." };

  const [{ data: codes }, { data: members }] = await Promise.all([
    ctx.supabase.from("action_items").select("code").eq("project_id", ctx.projectId),
    ctx.supabase.from("project_members").select("user_id, profile:profiles(full_name)").eq("project_id", ctx.projectId),
  ]);
  const used = (codes ?? []).map((c) => c.code as string | null);
  const people = ((members ?? []) as unknown as { user_id: string; profile: { full_name: string } | null }[])
    .map((m) => ({ id: m.user_id, name: m.profile?.full_name ?? "" }))
    .filter((p) => p.name);
  const origin = `Encaminhamento da reunião "${ctx.meeting.title}" de ${formatDate(ctx.meeting.scheduled_on)}.`;

  let created = 0;
  for (const i of todo) {
    const t = content.encaminhamentos[i];
    const matches = t.responsavel ? people.filter((p) => sameName(t.responsavel, p.name)) : [];
    const code = nextCode("AP", used);
    const { data, error } = await ctx.supabase
      .from("action_items")
      .insert({
        project_id: ctx.projectId,
        company_id: ctx.meeting.company_id,
        code,
        kind: "tarefa",
        title: t.oque.slice(0, 300),
        rationale: origin,
        executor_id: matches.length === 1 ? matches[0].id : null,
        owner_label: matches.length === 1 ? null : t.responsavel || null,
        due_on: t.prazo,
        visibility: ctx.meeting.visibility,
        created_by: ctx.access.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("atas: falha ao criar ação", error?.message);
      break;
    }
    used.push(code);
    t.action_id = data.id;
    created++;
  }
  if (created > 0) await ctx.supabase.from("meeting_minutes").update({ content }).eq("id", ctx.minutes.id);
  refresh(ctx.projectId);
  if (created < todo.length) return { error: `Criei ${created} de ${todo.length} ações. Tente de novo para as que faltaram.` };
  return { ok: created === 1 ? "1 ação criada no plano." : `${created} ações criadas no plano.` };
}

/** Decisões marcadas vão para o Registro de decisões do projeto. */
export async function sendDecisionsToRegister(_: MinutesResult, form: FormData): Promise<MinutesResult> {
  const ctx = await context(form.get("projectId"), form.get("meetingId"));
  if (!ctx?.minutes) return { error: "Só a consultoria registra decisões." };
  const content = normalizeMinutes(ctx.minutes.content) as MinutesContent;
  const picked = new Set(form.getAll("item").map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < content.decisoes.length));
  const todo = [...picked].filter((i) => !content.decisoes[i].decision_id);
  if (todo.length === 0) return { error: "Marque ao menos uma decisão que ainda não esteja no registro." };

  let created = 0;
  for (const i of todo) {
    const d = content.decisoes[i];
    const { data, error } = await ctx.supabase
      .from("decisions")
      .insert({
        project_id: ctx.projectId,
        company_id: ctx.meeting.company_id,
        meeting_id: ctx.meetingId,
        kind: "decisao",
        summary: d.texto.slice(0, 2000),
        basis: `Registrada na ata da reunião "${ctx.meeting.title}".`,
        decided_by: d.responsavel || null,
        status: "aprovada",
        decided_on: ctx.meeting.scheduled_on,
        visibility: ctx.meeting.visibility,
        created_by: ctx.access.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("atas: falha ao registrar decisão", error?.message);
      break;
    }
    d.decision_id = data.id;
    created++;
  }
  if (created > 0) await ctx.supabase.from("meeting_minutes").update({ content }).eq("id", ctx.minutes.id);
  refresh(ctx.projectId);
  if (created < todo.length) return { error: `Registrei ${created} de ${todo.length} decisões. Tente de novo para as que faltaram.` };
  return { ok: created === 1 ? "1 decisão registrada." : `${created} decisões registradas.` };
}

// ---------------------------------------------------------------------------
// Arquivo da ata (PDF ou Word feito fora): mesmo envio em 3 passos dos pedidos
// ---------------------------------------------------------------------------
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function prepareMinutesFile(input: {
  projectId: string;
  meetingId: string;
  fileName: string;
  size: number;
  type: string;
}): Promise<Result<{ documentId: string; path: string }>> {
  const ctx = await context(input.projectId, input.meetingId);
  if (!ctx) return { ok: false, error: "Só a consultoria anexa atas." };
  const fileName = String(input.fileName ?? "").slice(0, 255);
  const type = contentTypeFor(fileName, String(input.type ?? ""));
  const problem = validateUpload({ name: fileName, size: Number(input.size), type }, ATTACHMENT_EXTS);
  if (problem) return { ok: false, error: problem };

  // Sem ata ainda: nasce um rascunho em branco para receber o arquivo.
  let minutesId = ctx.minutes?.id;
  if (!minutesId) {
    const { data, error } = await ctx.supabase
      .from("meeting_minutes")
      .insert({ project_id: ctx.projectId, meeting_id: ctx.meetingId, engine: "importada", created_by: ctx.access.userId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Não foi possível preparar a ata." };
    minutesId = data.id;
  }

  const { data: doc, error } = await ctx.supabase
    .from("documents")
    .insert({
      project_id: ctx.projectId,
      company_id: ctx.meeting.company_id,
      title: `Ata · ${ctx.meeting.title} · ${formatDate(ctx.meeting.scheduled_on)}`.slice(0, 200),
      folder: "ATAS_DE_REUNIAO",
      origin: "consultoria",
      visibility: "internal",
      created_by: ctx.access.userId,
    })
    .select("id")
    .single();
  if (error || !doc) return { ok: false, error: "Não foi possível registrar o arquivo." };
  const path = `${ctx.meeting.company_id}/${ctx.projectId}/${doc.id}/v1-${safeFileName(fileName)}`;
  return { ok: true, documentId: doc.id, path };
}

export async function finalizeMinutesFile(input: {
  projectId: string;
  meetingId: string;
  documentId: string;
  path: string;
  fileName: string;
  size: number;
  type: string;
  sha256: string;
}): Promise<Result> {
  const ctx = await context(input.projectId, input.meetingId);
  if (!ctx?.minutes) return { ok: false, error: "Só a consultoria anexa atas." };
  if (!uuid.safeParse(input.documentId).success || !/^[a-f0-9]{64}$/.test(String(input.sha256))) {
    return { ok: false, error: "Dados do envio inválidos." };
  }
  const prefix = `${ctx.meeting.company_id}/${ctx.projectId}/${input.documentId}/`;
  const path = String(input.path ?? "");
  if (!path.startsWith(prefix) || path.includes("..")) return { ok: false, error: "Caminho de arquivo inválido." };

  const name = path.slice(prefix.length);
  const { data: listed } = await createAdminClient().storage.from(BUCKET).list(prefix.slice(0, -1), { search: name });
  const stored = listed?.find((o) => o.name === name);
  const storedSize = (stored?.metadata as { size?: number } | undefined)?.size;
  if (!stored || (storedSize !== undefined && storedSize !== Number(input.size))) {
    return { ok: false, error: "O arquivo não chegou completo. Tente enviar de novo." };
  }

  const fileName = String(input.fileName).slice(0, 255);
  const { error } = await ctx.supabase.from("document_versions").insert({
    document_id: input.documentId,
    company_id: ctx.meeting.company_id,
    version: 1,
    storage_path: path,
    file_name: fileName,
    mime_type: contentTypeFor(fileName, String(input.type ?? "")),
    size_bytes: Number(input.size),
    sha256: input.sha256,
    comment: `Ata da reunião "${ctx.meeting.title}"`,
    uploaded_by: ctx.access.userId,
  });
  if (error) return { ok: false, error: "Não foi possível registrar o arquivo." };

  // Troca o anexo anterior, se houver (o antigo sai da lista, como uma exclusão).
  const previous = ctx.minutes.attachment_document_id;
  await ctx.supabase.from("meeting_minutes").update({ attachment_document_id: input.documentId }).eq("id", ctx.minutes.id);
  if (previous && previous !== input.documentId) {
    await ctx.supabase.from("documents").update({ deleted_at: new Date().toISOString(), visibility: "internal" }).eq("id", previous);
  }
  await syncAttachment(ctx, input.documentId, ctx.minutes.status === "revisada");
  refresh(ctx.projectId);
  return { ok: true };
}
