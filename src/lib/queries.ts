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
      .select("id, code, title, rationale, area, how, owner_label, due_on, status, completion_criteria, dependency_note, objective_id, executor:profiles!action_items_executor_id_fkey(full_name)")
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

export async function getRequestDetail(requestId: string) {
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("info_requests")
    .select(
      "id, project_id, code, title, category, status, due_on, owner_label, assigned_to, description, purpose, minimum_content, examples, accepted_formats, instructions, checklist, visibility, project:projects(id, name, company:companies(trade_name))",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return null;
  const [docs, comments, members] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, title, created_by, deleted_at, created_at, author:profiles!documents_created_by_fkey(full_name), versions:document_versions(id, version, file_name, size_bytes, created_at, period, source, comment, checklist_items, uploader:profiles!document_versions_uploaded_by_fkey(full_name))",
      )
      .eq("info_request_id", requestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, body, visibility, created_at, author:profiles!comments_author_id_fkey(full_name)")
      .eq("target_type", "info_request")
      .eq("target_id", requestId)
      .order("created_at"),
    supabase
      .from("project_members")
      .select("user_id, role, profile:profiles(full_name)")
      .eq("project_id", request.project_id),
  ]);
  type Version = {
    id: string; version: number; file_name: string; size_bytes: number; created_at: string;
    period: string | null; source: string | null; comment: string | null; checklist_items: string[];
    uploader: { full_name: string } | null;
  };
  type Doc = {
    id: string; title: string; created_by: string; deleted_at: string | null; created_at: string;
    author: { full_name: string } | null; versions: Version[];
  };
  const documents = ((docs.data ?? []) as unknown as Doc[])
    .map((d) => ({ ...d, versions: [...d.versions].sort((a, b) => b.version - a.version) }))
    .filter((d) => d.versions.length > 0);
  return {
    request: request as unknown as RequestRow & {
      project_id: string;
      assigned_to: string | null;
      project: { id: string; name: string; company: { trade_name: string } | null };
    },
    documents,
    comments: (comments.data ?? []) as unknown as {
      id: string; body: string; visibility: "client" | "internal"; created_at: string; author: { full_name: string } | null;
    }[],
    members: (members.data ?? []) as unknown as { user_id: string; role: string; profile: { full_name: string } | null }[],
  };
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}
