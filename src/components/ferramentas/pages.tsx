import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteToolForm, GenerateActionButton, NewToolForm, ToolEditor } from "@/components/ferramentas/editor";
import { ToolView } from "@/components/ferramentas/views";
import { ToolAnalysisCard } from "@/components/relatorios/pages";
import { BackLink, Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { getProjectAccess } from "@/lib/access";
import { getProjectHeader, type Area } from "@/lib/execucao";
import { TOOLS, TOOL_KINDS, actionCandidates, isToolKind, normalize } from "@/lib/ferramentas";
import { formatDateTime } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function ToolsListPage({ area, projectId }: { area: Area; projectId: string }) {
  if (!UUID.test(projectId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_tools")
    .select("id, kind, title, visibility, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  const tools = (data ?? []).filter((t) => isToolKind(t.kind));
  const base = `/${area}/projetos/${projectId}`;
  const canEdit = access.staff && area !== "cliente";
  return (
    <>
      <BackLink href={base} label="Voltar ao projeto" />
      <PageTitle eyebrow={header.company?.trade_name} title="Ferramentas de gestão">
        {header.name}. {canEdit ? "Diagnóstico e análise do projeto. Cada item pode virar uma ação no plano." : "Análises compartilhadas pela consultoria."}
      </PageTitle>
      <div className={canEdit ? "grid gap-6 lg:grid-cols-[1fr_340px]" : ""}>
        <div className="space-y-2">
          {tools.length === 0 ? (
            <EmptyState>{canEdit ? "Nenhuma ferramenta criada ainda." : "A consultoria ainda não compartilhou nenhuma ferramenta."}</EmptyState>
          ) : (
            tools.map((t) => (
              <Link key={t.id} href={`${base}/ferramentas/${t.id}`} className="block">
                <Card className="!p-4 hover:border-soft-rose">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose">{TOOLS[t.kind as keyof typeof TOOLS].label}</p>
                  <p className="font-semibold text-plum">{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>Atualizada em {formatDateTime(t.updated_at)}</span>
                    {canEdit && <Badge tone={t.visibility === "client" ? "info" : "neutral"}>{t.visibility === "client" ? "Compartilhada" : "Interna"}</Badge>}
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
        {canEdit && (
          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 font-semibold text-plum">Nova ferramenta</h2>
              <NewToolForm area={area} projectId={projectId} />
            </Card>
            <Card>
              <h2 className="mb-2 font-semibold text-plum">Qual usar?</h2>
              <ul className="space-y-2 text-sm">
                {TOOL_KINDS.map((k) => (
                  <li key={k}><span className="font-semibold">{TOOLS[k].label}:</span> <span className="text-muted">{TOOLS[k].when}</span></li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export async function ToolPage({ area, projectId, toolId }: { area: Area; projectId: string; toolId: string }) {
  if (!UUID.test(projectId) || !UUID.test(toolId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("strategy_tools")
    .select("id, kind, title, data, notes, visibility, updated_at")
    .eq("id", toolId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!t || !isToolKind(t.kind)) notFound();
  const kind = t.kind;
  const data = normalize(kind, t.data);
  const info = TOOLS[kind];
  const base = `/${area}/projetos/${projectId}`;
  const canEdit = access.staff && area !== "cliente";

  let generated: { id: string; code: string | null; title: string }[] = [];
  if (canEdit) {
    const { data: acts } = await supabase.from("action_items").select("id, code, title").eq("source_tool_id", toolId).order("created_at");
    generated = acts ?? [];
  }
  const candidates = canEdit ? actionCandidates(kind, data) : [];
  const generatedTitles = new Set(generated.map((g) => g.title));

  return (
    <>
      <BackLink href={`${base}/ferramentas`} label="Todas as ferramentas" />
      <PageTitle eyebrow={info.label} title={t.title}>{info.summary}</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <a href={`/exportar/ferramenta/${toolId}`} download className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 font-semibold text-mauve hover:bg-tint">
          Baixar planilha (CSV)
        </a>
      </div>

      <div className={canEdit ? "grid gap-6 xl:grid-cols-[1fr_320px]" : ""}>
        <div className="space-y-6">
          {canEdit ? (
            <Card>
              <ToolEditor
                area={area}
                projectId={projectId}
                toolId={toolId}
                kind={kind}
                initial={data}
                title={t.title}
                notes={t.notes ?? ""}
                shared={t.visibility === "client"}
              />
            </Card>
          ) : (
            <>
              <ToolView kind={kind} data={data} />
              {t.notes && (
                <Card>
                  <h2 className="mb-2 font-semibold text-plum">Conclusões</h2>
                  <p className="whitespace-pre-line text-sm">{t.notes}</p>
                </Card>
              )}
              <p className="text-xs text-muted">Atualizada em {formatDateTime(t.updated_at)}.</p>
            </>
          )}

          {canEdit && (
            <Card>
              <h2 className="mb-1 font-semibold text-plum">Transformar em ações do plano</h2>
              <p className="mb-3 text-sm text-muted">Use o conteúdo salvo. Cada clique cria uma ação sem executor e sem prazo, que você completa no plano.</p>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">Preencha e salve a ferramenta para ver os itens aqui.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {candidates.map((c) => (
                    <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span><span className="text-xs font-semibold text-rose">{c.group}</span><br />{c.text}</span>
                      {generatedTitles.has(c.text.slice(0, 300)) ? (
                        <Badge tone="ok">Já está no plano</Badge>
                      ) : (
                        <GenerateActionButton area={area} projectId={projectId} toolId={toolId} itemKey={c.key} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {generated.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-1 text-sm font-semibold">Ações geradas desta ferramenta</p>
                  <ul className="space-y-1 text-sm">
                    {generated.map((g) => (
                      <li key={g.id}><Link href={`${base}/acoes/${g.id}`} className="text-mauve hover:text-plum">{g.code} · {g.title}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
          {canEdit && <ToolAnalysisCard area={area as "admin" | "consultor"} projectId={projectId} toolId={toolId} />}
          {canEdit && <DeleteToolForm area={area} projectId={projectId} toolId={toolId} />}
        </div>

        {canEdit && (
          <aside>
            <Card>
              <h2 className="mb-2 font-semibold text-plum">Como usar</h2>
              <p className="mb-2 text-sm text-muted">{info.when}</p>
              <ol className="list-decimal space-y-2 pl-5 text-sm">{info.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </Card>
          </aside>
        )}
      </div>
    </>
  );
}
