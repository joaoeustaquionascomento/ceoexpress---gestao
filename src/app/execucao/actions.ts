"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { nextCode } from "@/lib/codigos";
import { createClient } from "@/lib/supabase/server";
import { getProjectAccess } from "@/lib/access";

export type FormResult = { error?: string; ok?: string } | undefined;

const uuid = z.string().uuid();
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .catch(null);
const optDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .catch(null);
const optUuid = z.string().uuid().nullable().catch(null);

function refreshProject(projectId: string) {
  for (const area of ["admin", "consultor", "cliente"]) {
    revalidatePath(`/${area}/projetos/${projectId}`, "layout");
  }
}

function areaOf(form: FormData): "admin" | "consultor" | "cliente" {
  const a = form.get("area");
  return a === "admin" || a === "cliente" ? a : "consultor";
}

/** Mensagens do banco que podem ser mostradas como estão. */
function dbMessage(message: string | undefined, fallback: string): string {
  const known = [
    "Há ações de que esta depende ainda não concluídas",
    "Só o gestor do cliente ou o executor podem atualizar esta ação",
    "Só a consultoria cancela ou reabre ações canceladas",
    "Essa dependência criaria um ciclo entre ações",
    "O executor precisa participar do projeto",
    "Quem decide precisa participar do projeto",
  ];
  return known.find((k) => message?.includes(k)) ?? fallback;
}

// ---------------------------------------------------------------------------
// Ações do plano
// ---------------------------------------------------------------------------
const actionSchema = z.object({
  projectId: uuid,
  actionId: optUuid,
  code: optText(20),
  kind: z.enum(["tarefa", "pendencia", "acao_5w2h"]).catch("acao_5w2h"),
  objective_id: optUuid,
  title: z.string().trim().min(3, "Diga o que precisa ser realizado.").max(300),
  rationale: optText(4000),
  area: optText(300),
  how: optText(4000),
  priority: z.enum(["baixa", "media", "alta", "critica"]).catch("media"),
  executor_id: optUuid,
  owner_label: optText(200),
  approver_id: optUuid,
  decision_inputs: optText(4000),
  starts_on: optDate,
  due_on: optDate,
  resources: optText(2000),
  expected_evidence: optText(4000),
  completion_criteria: optText(4000),
  dependency_note: optText(2000),
  visibility: z.enum(["client", "internal"]).catch("client"),
});

export async function saveAction(_: FormResult, form: FormData): Promise<FormResult> {
  const raw = Object.fromEntries(
    [...actionSchema.keyof().options].map((k) => [k, form.get(k) === null ? null : String(form.get(k))]),
  );
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const d = parsed.data;
  if (d.starts_on && d.due_on && d.starts_on > d.due_on) return { error: "O início não pode ser depois do prazo." };
  const access = await getProjectAccess(d.projectId);
  if (!access?.staff) return { error: "Só a consultoria edita o plano de ação." };

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("company_id").eq("id", d.projectId).maybeSingle();
  if (!project) return { error: "Projeto não encontrado." };

  const fields = {
    code: d.code,
    kind: d.kind,
    objective_id: d.objective_id,
    title: d.title,
    rationale: d.rationale,
    area: d.area,
    how: d.how,
    priority: d.priority,
    executor_id: d.executor_id,
    owner_label: d.owner_label,
    approver_id: d.approver_id,
    decision_inputs: d.decision_inputs,
    starts_on: d.starts_on,
    due_on: d.due_on,
    resources: d.resources,
    expected_evidence: d.expected_evidence,
    completion_criteria: d.completion_criteria,
    dependency_note: d.dependency_note,
    visibility: d.visibility,
  };

  let actionId = d.actionId;
  if (actionId) {
    const { error } = await supabase.from("action_items").update(fields).eq("id", actionId).eq("project_id", d.projectId);
    if (error) return { error: dbMessage(error.message, "Não foi possível salvar a ação.") };
  } else {
    if (!fields.code) {
      const { data: codes } = await supabase.from("action_items").select("code").eq("project_id", d.projectId);
      fields.code = nextCode("AP", (codes ?? []).map((a) => a.code));
    }
    const { data, error } = await supabase
      .from("action_items")
      .insert({ ...fields, project_id: d.projectId, company_id: project.company_id, created_by: access.userId })
      .select("id")
      .single();
    if (error || !data) return { error: dbMessage(error?.message, "Não foi possível criar a ação.") };
    actionId = data.id;
  }

  // Dependências: substitui a lista pelo que foi marcado.
  const wanted = new Set(form.getAll("depends_on").map(String).filter((v) => uuid.safeParse(v).success && v !== actionId));
  const { data: current } = await supabase.from("action_dependencies").select("depends_on_id").eq("action_id", actionId);
  const have = new Set((current ?? []).map((r) => r.depends_on_id));
  const toRemove = [...have].filter((x) => !wanted.has(x));
  const toAdd = [...wanted].filter((x) => !have.has(x));
  if (toRemove.length) {
    await supabase.from("action_dependencies").delete().eq("action_id", actionId).in("depends_on_id", toRemove);
  }
  for (const dep of toAdd) {
    const { error } = await supabase.from("action_dependencies").insert({ action_id: actionId, depends_on_id: dep });
    if (error) return { error: dbMessage(error.message, "Não foi possível salvar uma das dependências.") };
  }

  refreshProject(d.projectId);
  redirect(`/${areaOf(form)}/projetos/${d.projectId}/acoes/${actionId}`);
}

export async function changeActionStatus(_: FormResult, form: FormData): Promise<FormResult> {
  const actionId = uuid.safeParse(form.get("actionId"));
  const projectId = uuid.safeParse(form.get("projectId"));
  const status = z.enum(["a_fazer", "em_andamento", "bloqueada", "concluida", "cancelada"]).safeParse(form.get("status"));
  const note = z.string().trim().max(2000).safeParse(form.get("note") ?? "");
  if (!actionId.success || !projectId.success || !status.success || !note.success) return { error: "Escolha o novo status." };
  if (status.data === "bloqueada" && !note.data) return { error: "Explique o que está bloqueando a ação." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_action_status", {
    p_action: actionId.data,
    p_status: status.data,
    p_note: note.data || null,
  });
  if (error) return { error: dbMessage(error.message, "Não foi possível atualizar o status.") };
  refreshProject(projectId.data);
  return { ok: "Status atualizado." };
}

export async function addActionComment(_: FormResult, form: FormData): Promise<FormResult> {
  const actionId = uuid.safeParse(form.get("actionId"));
  const body = z.string().trim().min(1).max(4000).safeParse(form.get("body"));
  if (!actionId.success || !body.success) return { error: "Escreva a mensagem." };
  const supabase = await createClient();
  const { data: action } = await supabase
    .from("action_items")
    .select("id, project_id, company_id, visibility")
    .eq("id", actionId.data)
    .maybeSingle();
  if (!action) return { error: "Ação não encontrada." };
  const access = await getProjectAccess(action.project_id);
  if (!access) return { error: "Sem acesso." };
  if (!access.staff && access.role === "client_viewer") return { error: "Seu perfil é apenas de consulta." };
  const internal = access.staff && (form.get("internal") === "on" || action.visibility === "internal");
  const { error } = await supabase.from("comments").insert({
    project_id: action.project_id,
    company_id: action.company_id,
    target_type: "action_item",
    target_id: action.id,
    body: body.data,
    visibility: internal ? "internal" : "client",
    author_id: access.userId,
  });
  if (error) return { error: "Não foi possível enviar a mensagem." };
  refreshProject(action.project_id);
  return { ok: internal ? "Nota interna registrada." : "Mensagem enviada." };
}

// ---------------------------------------------------------------------------
// Agenda: reuniões, marcos e decisões (só a consultoria edita)
// ---------------------------------------------------------------------------
async function staffContext(form: FormData) {
  const projectId = uuid.safeParse(form.get("projectId"));
  if (!projectId.success) return null;
  const access = await getProjectAccess(projectId.data);
  if (!access?.staff) return null;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("company_id").eq("id", projectId.data).maybeSingle();
  if (!project) return null;
  return { supabase, access, projectId: projectId.data, companyId: project.company_id as string };
}

export async function saveMeeting(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  if (!ctx) return { error: "Só a consultoria edita a agenda." };
  const parsed = z
    .object({
      id: optUuid,
      title: z.string().trim().min(3, "Dê um título ao encontro.").max(200),
      scheduled_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
      start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().catch(null),
      agenda: optText(4000),
      expected_output: optText(2000),
      minutes: optText(10000),
      held: z.boolean(),
      visibility: z.enum(["client", "internal"]).catch("client"),
    })
    .safeParse({
      id: form.get("id") || null,
      title: form.get("title"),
      scheduled_on: form.get("scheduled_on"),
      start_time: form.get("start_time") || null,
      agenda: form.get("agenda") ?? "",
      expected_output: form.get("expected_output") ?? "",
      minutes: form.get("minutes") ?? "",
      held: form.get("held") === "on",
      visibility: form.get("internal") === "on" ? "internal" : "client",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const { id, ...fields } = parsed.data;
  const q = id
    ? ctx.supabase.from("meetings").update(fields).eq("id", id).eq("project_id", ctx.projectId)
    : ctx.supabase.from("meetings").insert({ ...fields, project_id: ctx.projectId, company_id: ctx.companyId, created_by: ctx.access.userId });
  const { error } = await q;
  if (error) return { error: "Não foi possível salvar o encontro." };
  refreshProject(ctx.projectId);
  return { ok: id ? "Encontro atualizado." : "Encontro agendado." };
}

export async function saveMilestone(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  if (!ctx) return { error: "Só a consultoria edita os marcos." };
  const parsed = z
    .object({
      id: optUuid,
      name: z.string().trim().min(3, "Dê um nome ao marco.").max(200),
      planned_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data prevista."),
      achieved_on: optDate,
    })
    .safeParse({
      id: form.get("id") || null,
      name: form.get("name"),
      planned_on: form.get("planned_on"),
      achieved_on: form.get("achieved_on") || null,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const { id, ...fields } = parsed.data;
  const q = id
    ? ctx.supabase.from("milestones").update(fields).eq("id", id).eq("project_id", ctx.projectId)
    : ctx.supabase.from("milestones").insert({ ...fields, project_id: ctx.projectId, company_id: ctx.companyId });
  const { error } = await q;
  if (error) return { error: "Não foi possível salvar o marco." };
  refreshProject(ctx.projectId);
  return { ok: id ? "Marco atualizado." : "Marco criado." };
}

export async function saveDecision(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await staffContext(form);
  if (!ctx) return { error: "Só a consultoria edita o registro de decisões." };
  const parsed = z
    .object({
      id: optUuid,
      code: optText(20),
      kind: z.enum(["decisao", "lacuna", "hipotese", "premissa"]).catch("decisao"),
      summary: z.string().trim().min(3, "Descreva a decisão.").max(2000),
      basis: optText(4000),
      decided_by: optText(200),
      due_on: optDate,
      status: z.enum(["aguardando", "a_apurar", "aprovada", "rejeitada", "resolvida"]).catch("aguardando"),
      decided_on: optDate,
      meeting_id: optUuid,
      visibility: z.enum(["client", "internal"]).catch("client"),
    })
    .safeParse({
      id: form.get("id") || null,
      code: form.get("code") ?? "",
      kind: form.get("kind"),
      summary: form.get("summary"),
      basis: form.get("basis") ?? "",
      decided_by: form.get("decided_by") ?? "",
      due_on: form.get("due_on") || null,
      status: form.get("status"),
      decided_on: form.get("decided_on") || null,
      meeting_id: form.get("meeting_id") || null,
      visibility: form.get("internal") === "on" ? "internal" : "client",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const { id, ...fields } = parsed.data;
  const q = id
    ? ctx.supabase.from("decisions").update(fields).eq("id", id).eq("project_id", ctx.projectId)
    : ctx.supabase.from("decisions").insert({ ...fields, project_id: ctx.projectId, company_id: ctx.companyId, created_by: ctx.access.userId });
  const { error } = await q;
  if (error) return { error: "Não foi possível salvar o registro." };
  refreshProject(ctx.projectId);
  return { ok: id ? "Registro atualizado." : "Registro criado." };
}

/** Edição rápida (lista e Kanban): só quem executa e prazo. */
export async function quickUpdateAction(_: FormResult, form: FormData): Promise<FormResult> {
  const actionId = uuid.safeParse(form.get("actionId"));
  const projectId = uuid.safeParse(form.get("projectId"));
  if (!actionId.success || !projectId.success) return { error: "Ação inválida." };
  const access = await getProjectAccess(projectId.data);
  if (!access?.staff) return { error: "Só a consultoria edita o plano de ação." };
  const executor = optUuid.parse(form.get("executor_id") || null);
  const due = optDate.parse(form.get("due_on") || null);
  const ownerLabel = optText(200).parse(form.get("owner_label"));
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("action_items")
    .select("starts_on")
    .eq("id", actionId.data)
    .eq("project_id", projectId.data)
    .maybeSingle();
  if (!current) return { error: "Ação não encontrada." };
  if (due && current.starts_on && due < current.starts_on) return { error: "O prazo não pode ser antes do início." };
  const { error } = await supabase
    .from("action_items")
    .update({ executor_id: executor, owner_label: ownerLabel, due_on: due })
    .eq("id", actionId.data)
    .eq("project_id", projectId.data);
  if (error) return { error: dbMessage(error.message, "Não foi possível salvar.") };
  refreshProject(projectId.data);
  return { ok: "Salvo." };
}
