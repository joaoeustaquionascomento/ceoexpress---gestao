import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toCsv, slugify, type Cell } from "@/lib/csv";
import { ACTION_KIND, DECISION_KIND, DECISION_STATUS, PRIORITY } from "@/lib/execucao";
import { ACTION_STATUS, REQUEST_STATUS, formatDate, type RequestStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Exportação CSV de um projeto. Usa a sessão do próprio usuário, então o
 * banco (RLS) entrega só o que ele pode ver: o cliente não recebe itens internos.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIPOS = ["pedidos", "acoes", "decisoes"] as const;
type Tipo = (typeof TIPOS)[number];

const date = (d: string | null) => (d ? formatDate(d) : "");
const vis = (v: string) => (v === "internal" ? "Interno" : "Cliente");

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string; tipo: string }> }) {
  const { projectId, tipo } = await params;
  if (!UUID.test(projectId) || !TIPOS.includes(tipo as Tipo)) {
    return new NextResponse("Exportação não encontrada.", { status: 404 });
  }
  const user = await getSessionUser();
  if (!user) return new NextResponse("Entre no sistema para exportar.", { status: 401 });

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  if (!project) return new NextResponse("Projeto não encontrado.", { status: 404 });

  let header: string[];
  let rows: Cell[][];

  if (tipo === "pedidos") {
    const { data, error } = await supabase
      .from("info_requests")
      .select("code, title, category, stage, owner_label, due_on, status, visibility, updated_at, assignee:profiles!info_requests_assigned_to_fkey(full_name)")
      .eq("project_id", projectId)
      .order("sort_order")
      .order("code");
    if (error) return failed(error);
    header = ["Código", "Pedido", "Categoria", "Etapa", "Responsável", "Prazo", "Status", "Visibilidade", "Última movimentação"];
    rows = ((data ?? []) as unknown as {
      code: string; title: string; category: string; stage: string | null; owner_label: string | null; due_on: string | null;
      status: RequestStatus; visibility: string; updated_at: string; assignee: { full_name: string } | null;
    }[]).map((r) => [
      r.code, r.title, r.category, r.stage, r.assignee?.full_name ?? r.owner_label, date(r.due_on),
      REQUEST_STATUS[r.status]?.label ?? r.status, vis(r.visibility), date(r.updated_at),
    ]);
  } else if (tipo === "acoes") {
    const { data, error } = await supabase
      .from("action_items")
      .select("code, kind, title, priority, status, starts_on, due_on, owner_label, visibility, executor:profiles!action_items_executor_id_fkey(full_name), objective:objectives(code, name)")
      .eq("project_id", projectId)
      .order("code", { nullsFirst: false })
      .order("created_at");
    if (error) return failed(error);
    header = ["Código", "Tipo", "Ação", "Objetivo", "Quem executa", "Prioridade", "Status", "Início", "Prazo", "Visibilidade"];
    rows = ((data ?? []) as unknown as {
      code: string | null; kind: string; title: string; priority: string; status: string; starts_on: string | null; due_on: string | null;
      owner_label: string | null; visibility: string; executor: { full_name: string } | null; objective: { code: string; name: string } | null;
    }[]).map((a) => [
      a.code, ACTION_KIND[a.kind] ?? a.kind, a.title, a.objective ? `${a.objective.code} · ${a.objective.name}` : "",
      a.executor?.full_name ?? a.owner_label ?? "A definir", PRIORITY[a.priority]?.label ?? a.priority,
      ACTION_STATUS[a.status] ?? a.status, date(a.starts_on), date(a.due_on), vis(a.visibility),
    ]);
  } else {
    const { data, error } = await supabase
      .from("decisions")
      .select("code, kind, topic, summary, source, link_url, cost_note, basis, decided_by, due_on, review_on, status, decided_on, visibility")
      .eq("project_id", projectId)
      .order("code", { nullsFirst: false })
      .order("created_at");
    if (error) return failed(error);
    header = ["Código", "Tipo", "Assunto", "Resumo", "Quem trouxe", "Link", "Custo ou condições", "Fundamento", "Quem decide", "Prazo", "Revisar em", "Status", "Decidido em", "Visibilidade"];
    rows = (data ?? []).map((d) => [
      d.code, DECISION_KIND[d.kind] ?? d.kind, d.topic, d.summary, d.source, d.link_url, d.cost_note, d.basis, d.decided_by,
      date(d.due_on), date(d.review_on), DECISION_STATUS[d.status] ?? d.status, date(d.decided_on), vis(d.visibility),
    ]);
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const filename = `${tipo}-${slugify(project.name)}-${today}.csv`;
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function failed(error: { message: string }) {
  console.error("[exportar]", error.message);
  return new NextResponse("Não foi possível gerar o arquivo agora.", { status: 500 });
}
