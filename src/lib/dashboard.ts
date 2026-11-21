import "server-only";
import { createClient } from "@/lib/supabase/server";
import { progress, type RequestStatus } from "@/lib/status";

/** Painel: tudo calculado a partir dos registros que o usuário pode ver (RLS). */

type Req = { id: string; project_id: string; code: string; title: string; status: RequestStatus; due_on: string | null; updated_at: string };
type Act = { project_id: string; status: string; due_on: string | null };

function todayBR() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function getDashboard(filters: { empresa?: string; projeto?: string }) {
  const supabase = await createClient();
  const [projectsRes, reqRes, actRes, meetRes, msRes] = await Promise.all([
    supabase.from("projects").select("id, name, status, company:companies(id, trade_name)").order("created_at"),
    supabase.from("info_requests").select("id, project_id, code, title, status, due_on, updated_at"),
    supabase.from("action_items").select("project_id, status, due_on"),
    supabase.from("meetings").select("id, project_id, scheduled_on, start_time, title, held").gte("scheduled_on", todayBR()).order("scheduled_on").limit(50),
    supabase.from("milestones").select("id, project_id, name, planned_on, achieved_on").is("achieved_on", null).order("planned_on").limit(50),
  ]);
  type Proj = { id: string; name: string; status: string; company: { id: string; trade_name: string } | null };
  const allProjects = (projectsRes.data ?? []) as unknown as Proj[];
  const companies = [...new Map(allProjects.filter((p) => p.company).map((p) => [p.company!.id, p.company!.trade_name])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  let projects = allProjects;
  if (filters.empresa) projects = projects.filter((p) => p.company?.id === filters.empresa);
  if (filters.projeto) projects = projects.filter((p) => p.id === filters.projeto);
  const ids = new Set(projects.map((p) => p.id));

  const requests = ((reqRes.data ?? []) as Req[]).filter((r) => ids.has(r.project_id));
  const actions = ((actRes.data ?? []) as Act[]).filter((a) => ids.has(a.project_id));
  const today = todayBR();
  const in30 = addDays(today, 30);

  const requestCounts = countBy(requests.map((r) => r.status));
  const actionCounts = countBy(actions.map((a) => a.status));
  const live = actions.filter((a) => a.status !== "cancelada");
  const overdueActions = live.filter((a) => a.status !== "concluida" && a.due_on && a.due_on < today).length;
  const overdueRequests = requests.filter(
    (r) => r.due_on && r.due_on < today && ["nao_iniciado", "em_preenchimento", "complementacao_solicitada"].includes(r.status),
  ).length;

  const perProject = projects.map((p) => {
    const pr = progress(requests.filter((r) => r.project_id === p.id).map((r) => r.status));
    const acts = live.filter((a) => a.project_id === p.id);
    const done = acts.filter((a) => a.status === "concluida").length;
    return {
      ...p,
      requests: pr,
      waitingReview: requests.filter((r) => r.project_id === p.id && (r.status === "enviado" || r.status === "em_analise")).length,
      actions: {
        total: acts.length,
        done,
        donePct: acts.length ? Math.round((done / acts.length) * 100) : 0,
        overdue: acts.filter((a) => a.status !== "concluida" && a.due_on && a.due_on < today).length,
        blocked: acts.filter((a) => a.status === "bloqueada").length,
      },
    };
  });

  const projectName = new Map(allProjects.map((p) => [p.id, p.name]));
  return {
    companies,
    allProjects: allProjects.map((p) => ({ id: p.id, name: p.name, company: p.company?.trade_name ?? "" })),
    projects: perProject,
    totals: {
      requests: progress(requests.map((r) => r.status)),
      waitingReview: (requestCounts.enviado ?? 0) + (requestCounts.em_analise ?? 0),
      overdueRequests,
      actions: live.length,
      actionsDone: live.filter((a) => a.status === "concluida").length,
      overdueActions,
      blocked: actionCounts.bloqueada ?? 0,
    },
    requestCounts,
    actionCounts,
    meetings: (meetRes.data ?? [])
      .filter((m) => ids.has(m.project_id) && m.scheduled_on <= in30)
      .map((m) => ({ ...m, project: projectName.get(m.project_id) ?? "" })),
    milestones: (msRes.data ?? [])
      .filter((m) => ids.has(m.project_id) && m.planned_on <= in30)
      .map((m) => ({ ...m, project: projectName.get(m.project_id) ?? "", late: m.planned_on < today })),
  };
}

function countBy(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/** Fila de análise: pedidos enviados ou em análise, do mais antigo para o mais novo. */
export async function getReviewQueue() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("info_requests")
    .select("id, project_id, code, title, status, updated_at, project:projects(name, company:companies(trade_name))")
    .in("status", ["enviado", "em_analise"])
    .order("updated_at", { ascending: true })
    .limit(200);
  return (data ?? []) as unknown as {
    id: string;
    project_id: string;
    code: string;
    title: string;
    status: RequestStatus;
    updated_at: string;
    project: { name: string; company: { trade_name: string } | null } | null;
  }[];
}
