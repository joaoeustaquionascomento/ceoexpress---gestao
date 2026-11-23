import Link from "next/link";
import { notFound } from "next/navigation";
import { RadarChart, ScoreBars } from "@/components/mentoria/charts";
import {
  CreateApplicationsForm,
  ExternalForm,
  ImportForm,
  LinkActions,
  ReviewForm,
  type DimOption,
  type InstrumentOption,
  type Member,
} from "@/components/mentoria/forms";
import { PrintButton } from "@/components/relatorios/client";
import { BackLink, Badge, Card, EmptyState, Logo, PageTitle } from "@/components/ui";
import { getProjectAccess } from "@/lib/access";
import { getProjectHeader, type Area } from "@/lib/execucao";
import { suggestReadings, tagLabel } from "@/lib/mentoria/biblioteca";
import { STATUS_LABEL, appliedDate, getApplication, listApplications, listLibrary, previousOf, type Application } from "@/lib/mentoria/dados";
import { INSTRUMENTS, INSTRUMENT_LIST, itemCount } from "@/lib/mentoria/instrumentos";
import { buildReport } from "@/lib/mentoria/pontuacao";
import { isInstrumentId } from "@/lib/mentoria/tipos";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
const fmt1 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function titleOf(a: Pick<Application, "instrument" | "title">): string {
  if (isInstrumentId(a.instrument)) return INSTRUMENTS[a.instrument].name;
  return a.title || "Teste externo";
}

const SOURCE_LABEL: Record<Application["source"], string> = {
  link: "Respondida pelo link",
  externo: "Teste externo",
  importado: "Notas antigas",
};

/** Clientes do projeto (possíveis mentorados), com e-mail para o envio. */
async function projectClients(projectId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("user_id, role, profile:profiles(full_name, email)")
    .eq("project_id", projectId)
    .neq("role", "consultant");
  return ((data ?? []) as unknown as { user_id: string; profile: { full_name: string | null; email: string | null } | null }[])
    .map((m) => ({ id: m.user_id, name: m.profile?.full_name ?? "Sem nome", email: m.profile?.email ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export async function MentoriaListPage({ area, projectId }: { area: Area; projectId: string }) {
  if (!UUID.test(projectId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const staff = access.staff && area !== "cliente";
  const base = `/${area}/projetos/${projectId}`;
  const [apps, members] = await Promise.all([listApplications(projectId), staff ? projectClients(projectId) : Promise.resolve([])]);
  const visible = staff ? apps : apps.filter((a) => a.released_at);

  // Agrupa por pessoa, para ver o histórico de cada mentorado.
  const groups = new Map<string, Application[]>();
  for (const a of visible) {
    const key = a.respondent_name.trim();
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const defaultName = members.length === 1 ? members[0].name : "";
  const instruments: InstrumentOption[] = INSTRUMENT_LIST.map((i) => ({ id: i.id, name: i.name, summary: i.summary, minutes: i.minutes, count: itemCount(i) }));
  const dims: Record<string, DimOption[]> = Object.fromEntries(INSTRUMENT_LIST.map((i) => [i.id, i.dimensions.map((d) => ({ id: d.id, label: d.label }))]));

  return (
    <>
      <BackLink href={base} label="Voltar ao projeto" />
      <PageTitle eyebrow={header.company?.trade_name} title="Mentoria">
        {header.name}.{" "}
        {staff
          ? "Envie as avaliações por link, acompanhe as respostas, revise o relatório e libere para o mentorado quando quiser."
          : "Seus relatórios de avaliação, liberados pelo seu mentor."}
      </PageTitle>
      <div className={staff ? "grid gap-6 lg:grid-cols-[1fr_380px]" : ""}>
        <div className="space-y-6">
          {groups.size === 0 ? (
            <EmptyState>{staff ? "Nenhuma avaliação ainda. Use o quadro ao lado para enviar a primeira." : "Seu mentor ainda não liberou nenhum relatório."}</EmptyState>
          ) : (
            [...groups.entries()].map(([name, list]) => (
              <section key={name}>
                {staff && <h2 className="mb-2 font-semibold text-plum">{name}</h2>}
                <ul className="space-y-2">
                  {list.map((a) => {
                    const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.enviado;
                    const done = a.status === "respondido";
                    return (
                      <li key={a.id}>
                        <Link href={`${base}/mentoria/${a.id}`} className="block">
                          <Card className="!p-4 hover:border-soft-rose">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-plum">{titleOf(a)}</p>
                                <p className="text-xs text-muted">
                                  {SOURCE_LABEL[a.source]} · {done ? fmtDate(appliedDate(a)) : `enviada em ${fmtDate(a.created_at)}`}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {done && a.scores && a.source !== "externo" && (
                                  <span className="text-sm font-semibold">{fmt1(a.scores.overall)}</span>
                                )}
                                {staff && <Badge tone={st.tone}>{st.label}</Badge>}
                                {staff && done && <Badge tone={a.released_at ? "info" : "neutral"}>{a.released_at ? "Liberado" : "Não liberado"}</Badge>}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
        {staff && (
          <aside className="space-y-4">
            <Card>
              <h2 className="mb-1 font-semibold text-plum">Enviar avaliações</h2>
              <p className="mb-3 text-sm text-muted">Marque uma ou mais. Cada uma gera um link próprio, que funciona sem login e vale por 30 dias.</p>
              <CreateApplicationsForm projectId={projectId} instruments={instruments} members={members} defaultName={defaultName} />
            </Card>
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold text-plum">Registrar teste externo</summary>
                <p className="my-3 text-sm text-muted">Para testes feitos fora do app (de um livro ou de outra plataforma). Digite os números do resultado.</p>
                <ExternalForm projectId={projectId} members={members} defaultName={defaultName} />
              </details>
            </Card>
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold text-plum">Trazer notas antigas</summary>
                <p className="my-3 text-sm text-muted">Digite as notas de uma avaliação feita antes, em outra ferramenta. Elas viram o ponto de partida da comparação.</p>
                <ImportForm projectId={projectId} instruments={instruments} dims={dims} members={members} defaultName={defaultName} />
              </details>
            </Card>
          </aside>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

const COLORS = { atual: "var(--plum)", anterior: "var(--muted)", desejado: "var(--rose)" };

export async function MentoriaReportPage({ area, projectId, appId }: { area: Area; projectId: string; appId: string }) {
  if (!UUID.test(projectId) || !UUID.test(appId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const staff = access.staff && area !== "cliente";
  const base = `/${area}/projetos/${projectId}`;
  const app = await getApplication(projectId, appId);
  if (!app || (!staff && !app.released_at)) notFound();
  const [all, members, library] = await Promise.all([
    listApplications(projectId),
    staff ? projectClients(projectId) : Promise.resolve([]),
    listLibrary(),
  ]);
  const done = app.status === "respondido";
  const open = app.status === "enviado" || app.status === "em_andamento";
  const st = STATUS_LABEL[app.status] ?? STATUS_LABEL.enviado;

  return (
    <>
      <div className="print:hidden">
        <BackLink href={`${base}/mentoria`} label="Todas as avaliações" />
      </div>
      {staff && (
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <Badge tone={st.tone}>{st.label}</Badge>
          {done && <Badge tone={app.released_at ? "info" : "neutral"}>{app.released_at ? "Liberado para o mentorado" : "Ainda não liberado"}</Badge>}
          {done && <PrintButton />}
        </div>
      )}
      {!staff && <div className="mb-4 print:hidden"><PrintButton /></div>}

      <div className={staff ? "grid gap-6 xl:grid-cols-[1fr_320px]" : ""}>
        <div>
          {!done ? (
            <Card>
              <h1 className="text-xl font-semibold text-plum">{titleOf(app)}</h1>
              <p className="mt-1 text-sm text-muted">{app.respondent_name}</p>
              <p className="mt-4 text-sm">
                {app.status === "cancelado"
                  ? "Esta avaliação foi cancelada. O link não funciona mais."
                  : app.status === "em_andamento"
                    ? "O mentorado começou a responder. O relatório aparece aqui assim que ele enviar."
                    : "Aguardando o mentorado abrir o link. Se precisar, gere um novo link ao lado e envie de novo."}
              </p>
              {app.expires_at && open && <p className="mt-2 text-xs text-muted">Link válido até {fmtDate(app.expires_at)}.</p>}
            </Card>
          ) : (
            <article className="rounded-xl border border-line bg-surface p-5 sm:p-8 print:border-0 print:p-0">
              <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose">Relatório de mentoria · {SOURCE_LABEL[app.source]}</p>
                  <h1 className="mt-1 text-2xl font-semibold text-plum">{titleOf(app)}</h1>
                  <p className="mt-1 text-sm text-muted">{app.respondent_name} · {fmtDate(appliedDate(app))}</p>
                </div>
                <Logo width={120} />
              </header>
              {app.source === "externo" ? <ExternalBody app={app} /> : <InstrumentBody app={app} all={all} library={library} />}
              {app.mentor_comment && (
                <section className="mt-8 rounded-xl border border-soft-rose p-4 print:break-inside-avoid">
                  <h2 className="mb-2 text-lg font-semibold text-plum">Comentário do mentor</h2>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{app.mentor_comment}</p>
                </section>
              )}
              <footer className="mt-8 border-t border-line pt-3 text-xs text-muted">
                CEOEXPRESS | Gestão Estratégica · Avaliação de autopercepção para apoiar a mentoria. Não é diagnóstico clínico nem teste psicológico.
              </footer>
            </article>
          )}
        </div>
        {staff && (
          <aside className="space-y-4 print:hidden">
            <Card>
              <h2 className="mb-3 font-semibold text-plum">Revisão e liberação</h2>
              <ReviewForm
                projectId={projectId}
                appId={app.id}
                comment={app.mentor_comment ?? ""}
                released={!!app.released_at}
                respondentId={app.respondent_id ?? ""}
                members={members}
                canRelease={done}
              />
              {done && !app.respondent_id && (
                <p className="mt-3 text-xs text-muted">Para liberar, escolha a conta do mentorado no app. Se ele ainda não tem conta, convide-o pelo projeto.</p>
              )}
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold text-plum">Link e exclusão</h2>
              {app.respondent_email && <p className="mb-3 text-xs text-muted">E-mail: {app.respondent_email}</p>}
              <LinkActions projectId={projectId} appId={app.id} area={area} open={open && app.source === "link"} />
            </Card>
          </aside>
        )}
      </div>
    </>
  );
}

function InstrumentBody({ app, all, library }: { app: Application; all: Application[]; library: Awaited<ReturnType<typeof listLibrary>> }) {
  if (!isInstrumentId(app.instrument) || !app.scores) return <p className="text-sm text-muted">Sem notas para mostrar.</p>;
  const instr = INSTRUMENTS[app.instrument];
  const prev = previousOf(all, app);
  const report = buildReport(instr, app.scores, prev?.scores);
  const byOrder = instr.dimensions
    .map((d) => report.dims.find((r) => r.id === d.id))
    .filter((d): d is NonNullable<typeof d> => !!d);
  const hasDesired = byOrder.some((d) => d.desired !== undefined);
  const series = [
    { label: `Agora (${fmtDate(appliedDate(app))})`, values: byOrder.map((d) => d.score), color: COLORS.atual, fill: true },
    ...(prev ? [{ label: `Anterior (${fmtDate(appliedDate(prev))})`, values: byOrder.map((d) => d.previous ?? 0), color: COLORS.anterior, dashed: true }] : []),
    ...(hasDesired ? [{ label: "Desejado em 90 dias", values: byOrder.map((d) => d.desired ?? 0), color: COLORS.desejado, dashed: true }] : []),
  ];
  const risk = instr.polarity === "risco";
  const readings = suggestReadings(
    library,
    instr.id,
    report.attention.map((d) => d.id),
    { includeIndex: !!report.index && report.index.band.needsWork },
  );

  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <section className="rounded-xl bg-tint p-4 print:break-inside-avoid">
        <p className="font-semibold text-plum">{report.headline}</p>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{risk ? "Peso médio dos padrões" : "Média geral"}</p>
            <p className="text-2xl font-semibold text-plum">
              {fmt1(report.overall.score)} <span className="text-sm font-semibold text-muted">de 10</span>
            </p>
            <Delta value={report.overall.delta} risk={risk} />
          </div>
          {report.index && instr.index && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{instr.index.label}</p>
              <p className="text-2xl font-semibold text-plum">
                {report.index.value} <span className="text-sm font-semibold text-muted">de 100</span>
              </p>
              <p className="text-xs text-muted">Faixa: {report.index.band.label}. A partir de 80, a mente trabalha bem mais a favor do que contra.</p>
              <Delta value={report.index.delta} risk={false} />
            </div>
          )}
        </div>
        {risk && <p className="mt-3 text-xs text-muted">Nesta avaliação, nota alta quer dizer que o padrão pesa mais. O objetivo é ver as notas caírem com o tempo.</p>}
      </section>

      <section className="print:break-inside-avoid">
        <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Visão geral</h2>
        <RadarChart labels={byOrder.map((d) => d.label)} series={series} title={`Gráfico radar: ${instr.name}`} />
      </section>

      <section>
        <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Notas por {instr.id === "roda_vida" ? "área" : "dimensão"}</h2>
        <ScoreBars
          polarity={instr.polarity}
          rows={report.dims.map((d) => ({ label: d.label, score: d.score, band: d.band, delta: d.delta, desired: d.desired }))}
        />
        {hasDesired && <p className="mt-2 text-xs text-muted">A marca vertical mostra a nota desejada em 90 dias.</p>}
      </section>

      {(report.strengths.length > 0 || report.attention.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {report.strengths.length > 0 && (
            <div className="rounded-xl border border-line p-4 print:break-inside-avoid">
              <h3 className="mb-2 font-semibold text-ok">{risk ? "Onde você está mais protegido" : "Pontos fortes"}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">{report.strengths.map((d) => <li key={d.id}>{d.label}</li>)}</ul>
            </div>
          )}
          {report.attention.length > 0 && (
            <div className="rounded-xl border border-line p-4 print:break-inside-avoid">
              <h3 className="mb-2 font-semibold text-bad">Pedem atenção</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">{report.attention.map((d) => <li key={d.id}>{d.label}{d.gap !== undefined && d.gap > 0 ? ` (faltam ${fmt1(d.gap)} para o desejado)` : ""}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Leitura de cada {instr.id === "roda_vida" ? "área" : "dimensão"}</h2>
        <div className="space-y-4">
          {report.dims.map((d) => (
            <div key={d.id} className="print:break-inside-avoid">
              <p className="font-semibold">
                {d.label} <span className="text-sm text-muted">· {fmt1(d.score)} · {d.band.label}</span>
              </p>
              <p className="text-sm text-muted">{d.description}</p>
              <p className="mt-1">{d.reading}</p>
            </div>
          ))}
        </div>
      </section>

      {report.questions.length > 0 && (
        <section className="print:break-inside-avoid">
          <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Perguntas para refletir</h2>
          <ul className="list-disc space-y-1 pl-5">{report.questions.map((q, i) => <li key={i}>{q.text}</li>)}</ul>
        </section>
      )}
      {report.actions.length > 0 && (
        <section className="print:break-inside-avoid">
          <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Sugestões de prática</h2>
          <ul className="list-disc space-y-1 pl-5">{report.actions.map((a, i) => <li key={i}>{a.text}</li>)}</ul>
        </section>
      )}
      {readings.length > 0 && (
        <section className="print:break-inside-avoid">
          <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Para ler e assistir</h2>
          <ul className="space-y-2">
            {readings.map(({ dim, item }) => (
              <li key={item.id} className="text-sm">
                <span className="mr-2 inline-block rounded bg-tint px-1.5 py-0.5 text-xs font-semibold text-mauve">{item.kind === "livro" ? "Livro" : "Filme"}</span>
                <span className="font-semibold">{item.title}</span>
                {item.author ? <span className="text-muted"> · {item.author}</span> : null}
                <span className="block text-xs text-muted">{tagLabel(`${instr.id}:${dim}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Delta({ value, risk }: { value?: number; risk: boolean }) {
  if (value === undefined || value === 0) return null;
  const better = risk ? value < 0 : value > 0;
  return (
    <p className={`text-xs font-semibold ${better ? "text-ok" : "text-bad"}`}>
      {value > 0 ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} desde a anterior
    </p>
  );
}

function ExternalBody({ app }: { app: Application }) {
  const ext = app.external ?? {};
  const itens = ext.itens ?? [];
  return (
    <div className="space-y-6 text-[15px]">
      {ext.principal && (
        <section className="rounded-xl bg-tint p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{ext.principal.rotulo}</p>
          <p className="text-2xl font-semibold text-plum">
            {ext.principal.valor.toLocaleString("pt-BR")} <span className="text-sm font-semibold text-muted">de {ext.principal.maximo.toLocaleString("pt-BR")}</span>
          </p>
        </section>
      )}
      {itens.length > 0 && (
        <section>
          <h2 className="mb-3 border-b border-line pb-1 text-lg font-semibold text-plum">Resultados</h2>
          <ul className="space-y-2.5">
            {itens.map((it) => {
              const pct = it.maximo > 0 ? Math.max(0, Math.min(100, (it.valor / it.maximo) * 100)) : 0;
              return (
                <li key={it.rotulo} className="print:break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold">{it.rotulo}</span>
                    <span>{it.valor.toLocaleString("pt-BR")} / {it.maximo.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-mauve" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {ext.link && (
        <p className="text-sm print:hidden">
          <a href={ext.link} target="_blank" rel="noopener noreferrer" className="text-mauve hover:text-plum">Abrir o resultado original</a>
        </p>
      )}
    </div>
  );
}

