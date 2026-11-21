"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { TOOLS, actionCandidates, emptyData, isToolKind, normalize } from "@/lib/ferramentas";
import { createClient } from "@/lib/supabase/server";

export type ToolResult = { error?: string; ok?: string } | undefined;

const uuid = z.string().uuid();

async function staff(form: FormData) {
  const projectId = uuid.safeParse(form.get("projectId"));
  if (!projectId.success) return null;
  const access = await getProjectAccess(projectId.data);
  if (!access?.staff) return null;
  return { projectId: projectId.data, access, supabase: await createClient() };
}

function areaOf(form: FormData) {
  return form.get("area") === "admin" ? "admin" : "consultor";
}

function refresh(projectId: string) {
  for (const area of ["admin", "consultor", "cliente"]) revalidatePath(`/${area}/projetos/${projectId}`, "layout");
}

export async function createTool(_: ToolResult, form: FormData): Promise<ToolResult> {
  const ctx = await staff(form);
  if (!ctx) return { error: "Só a consultoria cria ferramentas." };
  const kind = form.get("kind");
  if (!isToolKind(kind)) return { error: "Escolha a ferramenta." };
  const title = String(form.get("title") ?? "").trim().slice(0, 200) || TOOLS[kind].label;
  const { data, error } = await ctx.supabase
    .from("strategy_tools")
    .insert({ project_id: ctx.projectId, kind, title, data: emptyData(kind), created_by: ctx.access.userId })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar a ferramenta." };
  refresh(ctx.projectId);
  redirect(`/${areaOf(form)}/projetos/${ctx.projectId}/ferramentas/${data.id}`);
}

export async function saveTool(_: ToolResult, form: FormData): Promise<ToolResult> {
  const ctx = await staff(form);
  const toolId = uuid.safeParse(form.get("toolId"));
  if (!ctx || !toolId.success) return { error: "Só a consultoria edita ferramentas." };
  const { data: tool } = await ctx.supabase
    .from("strategy_tools")
    .select("kind")
    .eq("id", toolId.data)
    .eq("project_id", ctx.projectId)
    .maybeSingle();
  if (!tool || !isToolKind(tool.kind)) return { error: "Ferramenta não encontrada." };
  let raw: unknown = {};
  try {
    raw = JSON.parse(String(form.get("data") ?? "{}"));
  } catch {
    return { error: "Conteúdo inválido. Recarregue a página e tente de novo." };
  }
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) return { error: "Dê um título à ferramenta." };
  const notes = String(form.get("notes") ?? "").trim().slice(0, 10000) || null;
  const { error } = await ctx.supabase
    .from("strategy_tools")
    .update({ title, notes, data: normalize(tool.kind, raw), visibility: form.get("shared") === "on" ? "client" : "internal" })
    .eq("id", toolId.data)
    .eq("project_id", ctx.projectId);
  if (error) return { error: "Não foi possível salvar." };
  refresh(ctx.projectId);
  return { ok: `Salvo às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}.` };
}

export async function deleteTool(_: ToolResult, form: FormData): Promise<ToolResult> {
  const ctx = await staff(form);
  const toolId = uuid.safeParse(form.get("toolId"));
  if (!ctx || !toolId.success) return { error: "Só a consultoria exclui ferramentas." };
  const { error } = await ctx.supabase.from("strategy_tools").delete().eq("id", toolId.data).eq("project_id", ctx.projectId);
  if (error) return { error: "Não foi possível excluir." };
  refresh(ctx.projectId);
  redirect(`/${areaOf(form)}/projetos/${ctx.projectId}/ferramentas`);
}

/** Próximo código livre no formato A01, A02… */
function nextCode(codes: (string | null)[]): string {
  const max = codes.reduce((m, c) => {
    const n = /^A(\d{1,4})$/i.exec(c ?? "");
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `A${String(max + 1).padStart(2, "0")}`;
}

export async function toolToAction(_: ToolResult, form: FormData): Promise<ToolResult> {
  const ctx = await staff(form);
  const toolId = uuid.safeParse(form.get("toolId"));
  const key = String(form.get("key") ?? "");
  if (!ctx || !toolId.success || !key) return { error: "Só a consultoria gera ações." };
  const { data: tool } = await ctx.supabase
    .from("strategy_tools")
    .select("kind, title, data, visibility")
    .eq("id", toolId.data)
    .eq("project_id", ctx.projectId)
    .maybeSingle();
  if (!tool || !isToolKind(tool.kind)) return { error: "Ferramenta não encontrada." };
  const item = actionCandidates(tool.kind, tool.data).find((c) => c.key === key);
  if (!item) return { error: "Item não encontrado. Salve a ferramenta e tente de novo." };

  const { data: existing } = await ctx.supabase.from("action_items").select("code").eq("project_id", ctx.projectId);
  const { data: created, error } = await ctx.supabase
    .from("action_items")
    .insert({
      project_id: ctx.projectId,
      code: nextCode((existing ?? []).map((a) => a.code)),
      kind: "acao_5w2h",
      title: item.text.slice(0, 300),
      rationale: `Gerada a partir de ${TOOLS[tool.kind].label} "${tool.title}" (${item.group}).`,
      visibility: tool.visibility,
      source_tool_id: toolId.data,
      created_by: ctx.access.userId,
    })
    .select("id, code")
    .single();
  if (error || !created) return { error: "Não foi possível criar a ação." };
  refresh(ctx.projectId);
  return { ok: `Ação ${created.code} criada no plano. Abra o plano para definir quem executa e o prazo.` };
}
