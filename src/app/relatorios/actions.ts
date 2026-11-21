"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { normalizeContent } from "@/lib/relatorios/conteudo";
import { createClient } from "@/lib/supabase/server";

export type ReportResult = { error?: string; ok?: string } | undefined;

const uuid = z.string().uuid();

async function staff(form: FormData) {
  const projectId = uuid.safeParse(form.get("projectId"));
  const reportId = uuid.safeParse(form.get("reportId"));
  if (!projectId.success || !reportId.success) return null;
  const access = await getProjectAccess(projectId.data);
  if (!access?.staff) return null;
  return { projectId: projectId.data, reportId: reportId.data, access, supabase: await createClient() };
}

function refresh(projectId: string) {
  for (const a of ["admin", "consultor", "cliente"]) revalidatePath(`/${a}/projetos/${projectId}`, "layout");
}

export async function saveReport(_: ReportResult, form: FormData): Promise<ReportResult> {
  const ctx = await staff(form);
  if (!ctx) return { error: "Só a consultoria edita relatórios." };
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) return { error: "Dê um título ao relatório." };
  const titulos = form.getAll("secao_titulo").map(String);
  const textos = form.getAll("secao_texto").map(String);
  const content = normalizeContent({
    resumo: String(form.get("resumo") ?? "").trim(),
    secoes: titulos.map((titulo, i) => ({ titulo: titulo.trim(), texto: (textos[i] ?? "").trim() })),
    lacunas: String(form.get("lacunas") ?? "").split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()),
  });
  const reviewed = form.get("revisado") === "on";
  const shared = form.get("shared") === "on";
  if (shared && !reviewed) return { error: "Marque o relatório como revisado antes de compartilhar com o cliente." };

  const { data: current } = await ctx.supabase
    .from("analysis_reports")
    .select("status")
    .eq("id", ctx.reportId)
    .eq("project_id", ctx.projectId)
    .maybeSingle();
  if (!current) return { error: "Relatório não encontrado." };

  const { error } = await ctx.supabase
    .from("analysis_reports")
    .update({
      title,
      content,
      status: reviewed ? "revisado" : "rascunho",
      visibility: shared ? "client" : "internal",
      ...(reviewed && current.status !== "revisado" ? { reviewed_by: ctx.access.userId, reviewed_at: new Date().toISOString() } : {}),
      ...(!reviewed ? { reviewed_by: null, reviewed_at: null } : {}),
    })
    .eq("id", ctx.reportId)
    .eq("project_id", ctx.projectId);
  if (error) return { error: "Não foi possível salvar." };
  refresh(ctx.projectId);
  return { ok: `Salvo às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}.` };
}

export async function deleteReport(_: ReportResult, form: FormData): Promise<ReportResult> {
  const ctx = await staff(form);
  if (!ctx) return { error: "Só a consultoria exclui relatórios." };
  const { error } = await ctx.supabase.from("analysis_reports").delete().eq("id", ctx.reportId).eq("project_id", ctx.projectId);
  if (error) return { error: "Não foi possível excluir." };
  refresh(ctx.projectId);
  redirect(`/${form.get("area") === "admin" ? "admin" : "consultor"}/projetos/${ctx.projectId}/relatorios`);
}
