import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { buildProjectDossier, buildToolDossier, reportTitle, type ReportContent } from "@/lib/relatorios/conteudo";
import { loadProjectData, loadToolData } from "@/lib/relatorios/dados";
import { AiError, aiConfigured, runAnalysis } from "@/lib/relatorios/ia";
import { ruleProjectReport, ruleToolReport } from "@/lib/relatorios/regras";
import { createClient } from "@/lib/supabase/server";

// Com IA, um projeto grande pode levar alguns minutos.
export const maxDuration = 300;

const body = z.object({
  projectId: z.string().uuid(),
  toolId: z.string().uuid().nullish(),
  area: z.enum(["admin", "consultor"]),
  engine: z.enum(["regras", "ia"]).default("regras"),
});

/** Limite de análises com IA por projeto em 24 horas, para conter custo por engano. */
const DAILY_AI_LIMIT = 30;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail("Origem não permitida.", 403);

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Pedido inválido.");
  const { projectId, toolId, area, engine } = parsed.data;

  const access = await getProjectAccess(projectId);
  if (!access?.staff) return fail("Só a consultoria gera relatórios.", 403);
  const supabase = await createClient();

  if (engine === "ia") {
    if (!aiConfigured()) return fail("A análise com IA ainda não está ligada.", 503);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from("analysis_reports")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("engine", "ia")
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_AI_LIMIT) return fail(`Limite de ${DAILY_AI_LIMIT} análises com IA por projeto em 24 horas atingido.`, 429);
  }

  let title: string;
  let content: ReportContent;
  let model: string | null = null;
  let usage: unknown = null;
  try {
    if (toolId) {
      const t = await loadToolData(projectId, toolId);
      if (!t) return fail("Ferramenta não encontrada.", 404);
      title = reportTitle("ferramenta", t.tool.title);
      if (engine === "ia") {
        const r = await runAnalysis("ferramenta", buildToolDossier(t));
        ({ content, model, usage } = r);
      } else content = ruleToolReport(t.tool, t.linkedActions);
    } else {
      const d = await loadProjectData(projectId);
      if (!d) return fail("Projeto não encontrado.", 404);
      title = reportTitle("projeto");
      if (engine === "ia") {
        const r = await runAnalysis("projeto", buildProjectDossier(d));
        ({ content, model, usage } = r);
      } else content = ruleProjectReport(d);
    }
  } catch (e) {
    if (e instanceof AiError) return fail(e.message, 502);
    console.error("relatorios: falha ao gerar", e);
    return fail("Não foi possível gerar o relatório.", 500);
  }

  const { data, error } = await supabase
    .from("analysis_reports")
    .insert({
      project_id: projectId,
      tool_id: toolId ?? null,
      engine,
      title: `${title}${engine === "ia" ? " (IA)" : ""}`.slice(0, 200),
      content,
      model,
      usage,
      created_by: access.userId,
    })
    .select("id")
    .single();
  if (error || !data) return fail("O relatório foi montado, mas não foi possível salvá-lo. Tente de novo.", 500);

  for (const a of ["admin", "consultor", "cliente"]) revalidatePath(`/${a}/projetos/${projectId}`, "layout");
  return NextResponse.json({ id: data.id, href: `/${area}/projetos/${projectId}/relatorios/${data.id}` });
}
