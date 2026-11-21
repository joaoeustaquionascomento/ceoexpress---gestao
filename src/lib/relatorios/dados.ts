import "server-only";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/execucao";
import type { DossierAction, DossierProject, DossierTool } from "./conteudo";
import type { ProjectData } from "./regras";

/**
 * Lê os dados do projeto com a sessão de quem pediu o relatório (o banco
 * filtra pelo que essa pessoa pode ver). Nomes de responsáveis não saem
 * daqui: só se há ou não responsável.
 */
type ActionRow = {
  code: string | null; title: string; rationale: string | null; area: string | null; priority: string;
  status: string; due_on: string | null; executor_id: string | null; owner_label: string | null; source_tool_id: string | null;
};

const ACTION_COLS = "code, title, rationale, area, priority, status, due_on, executor_id, owner_label, source_tool_id";

function toDossierAction(a: ActionRow): DossierAction {
  return {
    code: a.code, title: a.title, rationale: a.rationale, area: a.area, priority: a.priority, status: a.status,
    due_on: a.due_on, has_owner: Boolean(a.executor_id || a.owner_label), source_tool_id: a.source_tool_id,
  };
}

async function loadProject(projectId: string): Promise<DossierProject | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("kind, description, status, starts_on, ends_on")
    .eq("id", projectId)
    .maybeSingle();
  return data;
}

export async function loadProjectData(projectId: string): Promise<ProjectData | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const supabase = await createClient();
  const [req, act, dec, tools] = await Promise.all([
    supabase.from("info_requests").select("code, title, category, status, due_on").eq("project_id", projectId).order("sort_order").order("code"),
    supabase.from("action_items").select(ACTION_COLS).eq("project_id", projectId).order("code"),
    supabase.from("decisions").select("code, kind, summary, status, due_on").eq("project_id", projectId).order("created_at"),
    supabase.from("strategy_tools").select("id, kind, title, data, notes").eq("project_id", projectId).order("created_at"),
  ]);
  return {
    project,
    requests: req.data ?? [],
    actions: ((act.data ?? []) as ActionRow[]).map(toDossierAction),
    decisions: dec.data ?? [],
    tools: tools.data ?? [],
    today: today(),
  };
}

export async function loadToolData(
  projectId: string,
  toolId: string,
): Promise<{ project: DossierProject; tool: DossierTool; linkedActions: DossierAction[]; today: string } | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  const supabase = await createClient();
  const [{ data: tool }, { data: acts }] = await Promise.all([
    supabase.from("strategy_tools").select("id, kind, title, data, notes").eq("id", toolId).eq("project_id", projectId).maybeSingle(),
    supabase.from("action_items").select(ACTION_COLS).eq("source_tool_id", toolId).order("code"),
  ]);
  if (!tool) return null;
  return { project, tool, linkedActions: ((acts ?? []) as ActionRow[]).map(toDossierAction), today: today() };
}
