import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteReportForm, GenerateReportButton, PrintButton, ReportEditor } from "@/components/relatorios/client";
import { BackLink, Badge, Card, EmptyState, Logo, PageTitle } from "@/components/ui";
import { getProjectAccess } from "@/lib/access";
import { getProjectHeader, type Area } from "@/lib/execucao";
import { TOOLS, isToolKind } from "@/lib/ferramentas";
import { formatDateTime } from "@/lib/queries";
import { normalizeContent, textBlocks, type ReportContent } from "@/lib/relatorios/conteudo";
import { aiConfigured } from "@/lib/relatorios/ia";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type ReportRow = {
  id: string; title: string; engine: string; status: string; visibility: string; created_at: string; updated_at: string;
  tool: { kind: string; title: string } | null;
};

function StatusBadges({ r, staff }: { r: { status: string; visibility: string; engine?: string }; staff: boolean }) {
  if (!staff) return null;
  return (
    <>
      <Badge tone={r.status === "revisado" ? "ok" : "warn"}>{r.status === "revisado" ? "Revisado" : "Rascunho"}</Badge>
      {r.engine === "ia" && <Badge tone="info">IA</Badge>}
      <Badge tone={r.visibility === "client" ? "info" : "neutral"}>{r.visibility === "client" ? "Compartilhado" : "Interno"}</Badge>
    </>
  );
}

export function ReportList({ base, reports, staff }: { base: string; reports: ReportRow[]; staff: boolean }) {
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id}>
          <Link href={`${base}/relatorios/${r.id}`} className="block">
            <Card className="!p-4 hover:border-soft-rose">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose">
                {r.tool && isToolKind(r.tool.kind) ? `Análise · ${TOOLS[r.tool.kind].label}` : "Relatório do projeto"}
              </p>
              <p className="font-semibold text-plum">{r.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>Atualizado em {formatDateTime(r.updated_at)}</span>
                <StatusBadges r={r} staff={staff} />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function ReportsListPage({ area, projectId }: { area: Area; projectId: string }) {
  if (!UUID.test(projectId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_reports")
    .select("id, title, engine, status, visibility, created_at, updated_at, tool:strategy_tools(kind, title)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const reports = (data ?? []) as unknown as ReportRow[];
  const base = `/${area}/projetos/${projectId}`;
  const staff = access.staff && area !== "cliente";
  return (
    <>
      <BackLink href={base} label="Voltar ao projeto" />
      <PageTitle eyebrow={header.company?.trade_name} title="Relatórios">
        {header.name}.{" "}
        {staff
          ? "O sistema lê ferramentas, plano de ação, pedidos e decisões e monta um rascunho. Você revisa, ajusta e decide se compartilha com o cliente."
          : "Relatórios revisados e compartilhados pela consultoria."}
      </PageTitle>
      <div className={staff ? "grid gap-6 lg:grid-cols-[1fr_340px]" : ""}>
        <div>
          {reports.length === 0 ? (
            <EmptyState>{staff ? "Nenhum relatório gerado ainda." : "A consultoria ainda não compartilhou nenhum relatório."}</EmptyState>
          ) : (
            <ReportList base={base} reports={reports} staff={staff} />
          )}
        </div>
        {staff && (
          <Card>
            <h2 className="mb-2 font-semibold text-plum">Novo relatório do projeto</h2>
            <p className="mb-3 text-sm text-muted">
              Junta diagnóstico, prioridades, andamento do plano, riscos e próximos passos, a partir do que está cadastrado. Para analisar uma ferramenta só, abra a ferramenta.
            </p>
            <div className="flex flex-wrap gap-2">
              <GenerateReportButton area={area as "admin" | "consultor"} projectId={projectId} label="Gerar relatório" />
              {aiConfigured() && <GenerateReportButton area={area as "admin" | "consultor"} projectId={projectId} label="Analisar com IA" engine="ia" secondary />}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

/** Corpo do relatório, igual na tela e na impressão. */
export function ReportBody({ content }: { content: ReportContent }) {
  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      {content.resumo && (
        <section className="rounded-xl bg-tint p-4 print:break-inside-avoid">
          <h2 className="mb-2 text-lg font-semibold text-plum">Resumo executivo</h2>
          {textBlocks(content.resumo).map((b, i) => <Block key={i} b={b} />)}
        </section>
      )}
      {content.secoes.map((s, i) => (
        <section key={i}>
          <h2 className="mb-2 border-b border-line pb-1 text-lg font-semibold text-plum print:break-after-avoid">{s.titulo}</h2>
          <div className="space-y-3">{textBlocks(s.texto).map((b, j) => <Block key={j} b={b} />)}</div>
        </section>
      ))}
    </div>
  );
}

function Block({ b }: { b: ReturnType<typeof textBlocks>[number] }) {
  if (b.type === "p") return <p className="mb-3 last:mb-0">{b.text}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {b.items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

export async function ReportPage({ area, projectId, reportId, edit }: { area: Area; projectId: string; reportId: string; edit: boolean }) {
  if (!UUID.test(projectId) || !UUID.test(reportId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("analysis_reports")
    .select("id, tool_id, title, engine, content, status, visibility, model, created_at, updated_at, reviewed_at, tool:strategy_tools(kind, title)")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!r) notFound();
  const report = r as unknown as ReportRow & { tool_id: string | null; content: unknown; model: string | null; reviewed_at: string | null };
  const content = normalizeContent(report.content);
  const base = `/${area}/projetos/${projectId}`;
  const staff = access.staff && area !== "cliente";
  const pageUrl = `${base}/relatorios/${reportId}`;

  return (
    <>
      <div className="print:hidden">
        <BackLink href={report.tool_id && staff ? `${base}/ferramentas/${report.tool_id}` : `${base}/relatorios`} label={report.tool_id && staff ? "Voltar à ferramenta" : "Todos os relatórios"} />
      </div>
      {staff && (
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <StatusBadges r={report} staff />
          {edit ? (
            <Link href={pageUrl} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">Ver como fica</Link>
          ) : (
            <Link href={`${pageUrl}?editar=1`} className="inline-flex min-h-11 items-center rounded-lg bg-plum px-4 text-sm font-semibold text-white hover:bg-mauve">Revisar e editar</Link>
          )}
          {!edit && <PrintButton />}
        </div>
      )}
      {!staff && <div className="mb-4 print:hidden"><PrintButton /></div>}

      {staff && report.status !== "revisado" && !edit && (
        <p className="mb-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn print:hidden">
          Rascunho montado {report.engine === "ia" ? "pela IA" : "automaticamente a partir dos dados"}. Confira e complete antes de marcar como revisado e compartilhar.
        </p>
      )}

      {edit && staff ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <Card>
            <ReportEditor area={area} projectId={projectId} reportId={reportId} title={report.title} content={content} reviewed={report.status === "revisado"} shared={report.visibility === "client"} />
          </Card>
          <aside className="space-y-4">
            <Card>
              <h2 className="mb-2 font-semibold text-plum">Como revisar</h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Confira se os números e os códigos (PI-.., AP-..) batem com o projeto.</li>
                <li>Corte o que for óbvio ou genérico e acrescente o que só a consultoria sabe.</li>
                <li>Veja a lista de informações que faltam e peça ao cliente o que for necessário.</li>
                <li>Marque como revisado e, se for o caso, compartilhe com o cliente.</li>
              </ol>
            </Card>
            <DeleteReportForm area={area} projectId={projectId} reportId={reportId} />
          </aside>
        </div>
      ) : (
        <article className="rounded-xl border border-line bg-surface p-5 sm:p-8 print:border-0 print:p-0">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose">
                {report.tool && isToolKind(report.tool.kind) ? `Análise · ${TOOLS[report.tool.kind].label}` : "Relatório do projeto"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-plum">{report.title}</h1>
              <p className="mt-1 text-sm text-muted">
                {header.company?.trade_name ? `${header.company.trade_name} · ` : ""}{header.name}
              </p>
            </div>
            <Logo width={120} />
          </header>
          <ReportBody content={content} />
          {staff && content.lacunas.length > 0 && (
            <section className="mt-6 rounded-xl border border-dashed border-line p-4 print:hidden">
              <h2 className="mb-2 font-semibold text-plum">Informações que faltam (só a consultoria vê)</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{content.lacunas.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </section>
          )}
          <footer className="mt-8 border-t border-line pt-3 text-xs text-muted">
            CEOEXPRESS | Gestão Estratégica · {report.reviewed_at ? `Revisado em ${formatDateTime(report.reviewed_at)}` : `Gerado em ${formatDateTime(report.created_at)}`}
            {staff && report.engine === "ia" ? <span className="print:hidden"> · Rascunho inicial feito com IA</span> : null}
          </footer>
        </article>
      )}
    </>
  );
}

/** Cartão de análise automática na página de uma ferramenta (só consultoria). */
export async function ToolAnalysisCard({ area, projectId, toolId }: { area: "admin" | "consultor"; projectId: string; toolId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_reports")
    .select("id, title, engine, status, visibility, created_at, updated_at")
    .eq("tool_id", toolId)
    .order("created_at", { ascending: false });
  const base = `/${area}/projetos/${projectId}`;
  return (
    <Card>
      <h2 className="mb-1 font-semibold text-plum">Análise automática</h2>
      <p className="mb-3 text-sm text-muted">Usa o conteúdo salvo e monta leitura, achados, implicações e recomendações. Você revisa antes de compartilhar.</p>
      <div className="flex flex-wrap gap-2">
        <GenerateReportButton area={area} projectId={projectId} toolId={toolId} label="Gerar análise" />
        {aiConfigured() && <GenerateReportButton area={area} projectId={projectId} toolId={toolId} label="Analisar com IA" engine="ia" secondary />}
      </div>
      {(data ?? []).length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          {(data ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <Link href={`${base}/relatorios/${r.id}`} className="text-mauve hover:text-plum">{r.title}</Link>
              <StatusBadges r={r} staff />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
