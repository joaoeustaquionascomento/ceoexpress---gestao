import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Consultas da fase 3 (execução). O banco (RLS) filtra o que cada um vê. */

export type Area = "admin" | "consultor" | "cliente";

export const PRIORITY: Record<string, { label: string; tone: "neutral" | "info" | "warn" | "bad" }> = {
  baixa: { label: "Baixa", tone: "neutral" },
  media: { label: "Média", tone: "info" },
  alta: { label: "Alta", tone: "warn" },
  critica: { label: "Crítica", tone: "bad" },
};

export const ACTION_KIND: Record<string, string> = {
  tarefa: "Tarefa",
  pendencia: "Pendência",
  acao_5w2h: "Ação 5W2H",
};

export const ACTION_STATUSES = ["a_fazer", "em_andamento", "bloqueada", "concluida", "cancelada"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const DECISION_KIND: Record<string, string> = {
  decisao: "Decisão",
  lacuna: "Lacuna",
  hipotese: "Hipótese",
  premissa: "Premissa",
  proposta: "Proposta para avaliar",
  alinhamento: "Alinhamento",
};

/** Ajuda curta de cada tipo de registro (aparece no formulário). */
export const DECISION_KIND_HINT: Record<string, string> = {
  decisao: "Algo que precisa ser decidido ou já foi decidido (ex.: contratar uma ferramenta).",
  lacuna: "Uma informação que falta e precisa ser apurada.",
  hipotese: "Uma suposição a ser confirmada.",
  premissa: "Um ponto de partida aceito por todos.",
  proposta: "Uma proposta recebida de fornecedor ou parceiro para avaliar com calma.",
  alinhamento: "O que foi combinado numa reunião ou conselho, com os próximos passos.",
};

export const SIDE: Record<string, string> = {
  consultoria: "Consultoria",
  cliente: "Cliente",
};

export const DECISION_STATUS: Record<string, string> = {
  aguardando: "Aguardando",
  a_apurar: "A apurar",
  em_avaliacao: "Em avaliação",
  adiada: "Adiada (no radar)",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  resolvida: "Resolvida",
};

export type PlanAction = {
  id: string;
  code: string | null;
  kind: string;
  title: string;
  rationale: string | null;
  priority: string;
  status: ActionStatus;
  due_on: string | null;
  starts_on: string | null;
  owner_label: string | null;
  executor_id: string | null;
  objective_id: string | null;
  visibility: "client" | "internal";
  side: "consultoria" | "cliente" | null;
  executor: { full_name: string } | null;
};

export function today(): string {
  // Data de hoje no fuso de Brasília.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function isOverdue(a: { status: string; due_on: string | null }): boolean {
  return !!a.due_on && a.due_on < today() && a.status !== "concluida" && a.status !== "cancelada";
}

export function executorName(a: { executor: { full_name: string } | null; owner_label: string | null }): string {
  return a.executor?.full_name ?? a.owner_label ?? "A definir";
}

export async function getProjectHeader(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, company:companies(trade_name)")
    .eq("id", projectId)
    .maybeSingle();
  return data as unknown as { id: string; name: string; company: { trade_name: string } | null } | null;
}

export async function getPlan(projectId: string) {
  const supabase = await createClient();
  const [actions, objectives, deps, meetings, milestones] = await Promise.all([
    supabase
      .from("action_items")
      .select(
        "id, code, kind, title, rationale, priority, status, due_on, starts_on, owner_label, executor_id, objective_id, visibility, side, executor:profiles!action_items_executor_id_fkey(full_name)",
      )
      .eq("project_id", projectId)
      .order("code", { nullsFirst: false })
      .order("created_at"),
    supabase.from("objectives").select("id, code, name").eq("project_id", projectId).order("sort_order"),
    supabase.from("action_dependencies").select("action_id, depends_on_id"),
    supabase.from("meetings").select("id, scheduled_on, start_time, title, held").eq("project_id", projectId),
    supabase.from("milestones").select("id, name, planned_on, achieved_on").eq("project_id", projectId),
  ]);
  if (actions.error) throw actions.error;
  return {
    actions: (actions.data ?? []) as unknown as PlanAction[],
    objectives: objectives.data ?? [],
    deps: deps.data ?? [],
    meetings: meetings.data ?? [],
    milestones: milestones.data ?? [],
  };
}

export async function getActionDetail(actionId: string) {
  const supabase = await createClient();
  const { data: action } = await supabase
    .from("action_items")
    .select(
      "*, executor:profiles!action_items_executor_id_fkey(full_name), approver:profiles!action_items_approver_id_fkey(full_name), objective:objectives(code, name)",
    )
    .eq("id", actionId)
    .maybeSingle();
  if (!action) return null;
  const [deps, dependents, history, comments] = await Promise.all([
    supabase
      .from("action_dependencies")
      .select("depends_on:action_items!action_dependencies_depends_on_id_fkey(id, code, title, status)")
      .eq("action_id", actionId),
    supabase
      .from("action_dependencies")
      .select("action:action_items!action_dependencies_action_id_fkey(id, code, title, status)")
      .eq("depends_on_id", actionId),
    supabase
      .from("action_updates")
      .select("id, status_from, status_to, note, created_at, author:profiles(full_name)")
      .eq("action_id", actionId)
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, body, visibility, created_at, author:profiles!comments_author_id_fkey(full_name)")
      .eq("target_type", "action_item")
      .eq("target_id", actionId)
      .order("created_at"),
  ]);
  type Ref = { id: string; code: string | null; title: string; status: string };
  return {
    action: action as Record<string, unknown> & {
      id: string;
      project_id: string;
      company_id: string;
      code: string | null;
      kind: string;
      title: string;
      status: ActionStatus;
      priority: string;
      visibility: "client" | "internal";
      executor_id: string | null;
      approver_id: string | null;
      objective_id: string | null;
      owner_label: string | null;
      due_on: string | null;
      starts_on: string | null;
      executor: { full_name: string } | null;
      approver: { full_name: string } | null;
      objective: { code: string; name: string } | null;
    },
    dependsOn: ((deps.data ?? []) as unknown as { depends_on: Ref }[]).map((d) => d.depends_on).filter(Boolean),
    dependents: ((dependents.data ?? []) as unknown as { action: Ref }[]).map((d) => d.action).filter(Boolean),
    history: (history.data ?? []) as unknown as {
      id: string;
      status_from: string | null;
      status_to: string;
      note: string | null;
      created_at: string;
      author: { full_name: string } | null;
    }[],
    comments: (comments.data ?? []) as unknown as {
      id: string;
      body: string;
      visibility: "client" | "internal";
      created_at: string;
      author: { full_name: string } | null;
    }[],
  };
}

/** Pessoas do projeto, para escolher executor e quem decide. */
export async function getProjectPeople(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("user_id, role, profile:profiles(full_name)")
    .eq("project_id", projectId);
  return ((data ?? []) as unknown as { user_id: string; role: string; profile: { full_name: string } | null }[])
    .map((m) => ({ id: m.user_id, role: m.role, name: m.profile?.full_name ?? "Sem nome" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getActionOptions(projectId: string) {
  const supabase = await createClient();
  const [objectives, actions] = await Promise.all([
    supabase.from("objectives").select("id, code, name").eq("project_id", projectId).order("sort_order"),
    supabase.from("action_items").select("id, code, title").eq("project_id", projectId).order("code"),
  ]);
  return { objectives: objectives.data ?? [], actions: actions.data ?? [] };
}

export async function getAgenda(projectId: string) {
  const supabase = await createClient();
  const [meetings, milestones, decisions, linked] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, scheduled_on, start_time, title, agenda, expected_output, minutes, held, visibility")
      .eq("project_id", projectId)
      .order("scheduled_on"),
    supabase.from("milestones").select("id, name, planned_on, achieved_on").eq("project_id", projectId).order("planned_on"),
    supabase
      .from("decisions")
      .select(
        "id, code, kind, summary, basis, decided_by, due_on, status, decided_on, visibility, meeting_id, topic, details, link_url, source, cost_note, review_on",
      )
      .eq("project_id", projectId)
      .order("code", { nullsFirst: false })
      .order("created_at"),
    supabase
      .from("action_items")
      .select("id, code, title, status, side, due_on, owner_label, decision_id")
      .eq("project_id", projectId)
      .not("decision_id", "is", null)
      .order("code"),
  ]);
  const stepsByDecision: Record<string, NonNullable<typeof linked.data>> = {};
  for (const a of linked.data ?? []) {
    if (!a.decision_id) continue;
    (stepsByDecision[a.decision_id] ??= []).push(a);
  }
  return {
    meetings: meetings.data ?? [],
    milestones: milestones.data ?? [],
    decisions: decisions.data ?? [],
    stepsByDecision,
  };
}
