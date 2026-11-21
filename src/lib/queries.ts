import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/status";

/** Todas as consultas usam o cliente do usuário: o banco (RLS) filtra o que ele pode ver. */

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  starts_on: string | null;
  company: { id: string; trade_name: string } | null;
};

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, starts_on, company:companies(id, trade_name)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ProjectRow[];
}

export async function requestStatusesByProject() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("info_requests").select("project_id, status");
  if (error) throw error;
  const map = new Map<string, RequestStatus[]>();
  for (const r of data ?? []) {
    const list = map.get(r.project_id) ?? [];
    list.push(r.status as RequestStatus);
    map.set(r.project_id, list);
  }
  return map;
}

export async function actionStatsByProject() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("action_items").select("project_id, status, due_on");
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  const map = new Map<string, { total: number; done: number; overdue: number; open: number }>();
  for (const a of data ?? []) {
    const s = map.get(a.project_id) ?? { total: 0, done: 0, overdue: 0, open: 0 };
    if (a.status === "cancelada") continue;
    s.total++;
    if (a.status === "concluida") s.done++;
    else {
      s.open++;
      if (a.due_on && a.due_on < today) s.overdue++;
    }
    map.set(a.project_id, s);
  }
  return map;
}

export type RequestRow = {
  id: string;
  code: string;
  title: string;
  category: string;
  status: RequestStatus;
  due_on: string | null;
  owner_label: string | null;
  description: string | null;
  purpose: string | null;
  minimum_content: string | null;
  examples: string | null;
  accepted_formats: string[];
  instructions: string | null;
  checklist: { item: string; instrucao: string | null }[];
  visibility: "client" | "internal";
};

export async function getProject(id: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, kind, description, status, starts_on, monthly_hours, company:companies(id, trade_name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) return null;
  const [requests, objectives, actions, meetings, decisions] = await Promise.all([
    supabase
      .from("info_requests")
      .select(
        "id, code, title, category, status, due_on, owner_label, description, purpose, minimum_content, examples, accepted_formats, instructions, checklist, visibility",
      )
      .eq("project_id", id)
      .order("sort_order"),
    supabase.from("objectives").select("id, code, name, who_decides, decision_inputs, verification").eq("project_id", id).order("sort_order"),
    supabase
      .from("action_items")
      .select("id, code, title, rationale, area, how, owner_label, due_on, status, completion_criteria, dependency_note, objective_id")
      .eq("project_id", id)
      .order("code"),
    supabase.from("meetings").select("id, scheduled_on, title, agenda, expected_output, held").eq("project_id", id).order("scheduled_on"),
    supabase.from("decisions").select("id, code, kind, summary, basis, decided_by, due_on, status").eq("project_id", id).order("code"),
  ]);
  return {
    project: project as unknown as {
      id: string;
      name: string;
      kind: string | null;
      description: string | null;
      status: string;
      starts_on: string | null;
      monthly_hours: number | null;
      company: { id: string; trade_name: string } | null;
    },
    requests: (requests.data ?? []) as RequestRow[],
    objectives: objectives.data ?? [],
    actions: actions.data ?? [],
    meetings: meetings.data ?? [],
    decisions: decisions.data ?? [],
  };
}
