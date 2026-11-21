import Link from "next/link";
import { Badge, Card, EmptyState, PageTitle, Stat } from "@/components/ui";
import { getDashboard } from "@/lib/dashboard";
import { ACTION_STATUS, REQUEST_STATUS, formatDate } from "@/lib/status";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Distribuição por status: uma barra por status, comprimento proporcional à
 * quantidade, número escrito ao lado (a cor nunca é a única pista).
 */
function Distribution({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <h2 className="mb-1 font-semibold text-plum">{title}</h2>
      <p className="mb-3 text-xs text-muted">{total} no total</p>
      {total === 0 ? (
        <p className="text-sm text-muted">Nenhum registro.</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} title={`${r.label}: ${r.value} (${total ? Math.round((r.value / total) * 100) : 0}%)`}>
                <th scope="row" className="w-40 py-1 pr-2 text-left font-normal text-ink">{r.label}</th>
                <td className="py-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 rounded-r bg-transparent">
                      {r.value > 0 && <div className="h-3 rounded-r bg-mauve" style={{ width: `${(r.value / max) * 100}%` }} />}
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted">{r.value}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export async function Dashboard({
  area, searchParams, title, eyebrow, intro,
}: {
  area: "admin" | "consultor";
  searchParams: Promise<Record<string, string | undefined>>;
  title: string;
  eyebrow: string;
  intro: string;
}) {
  const sp = await searchParams;
  const filters = {
    empresa: sp.empresa && UUID.test(sp.empresa) ? sp.empresa : undefined,
    projeto: sp.projeto && UUID.test(sp.projeto) ? sp.projeto : undefined,
  };
  const d = await getDashboard(filters);
  const t = d.totals;

  return (
    <>
      <PageTitle eyebrow={eyebrow} title={title}>{intro}</PageTitle>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
        {d.companies.length > 1 && (
          <label className="space-y-1">
            <span className="block font-semibold">Cliente</span>
            <select name="empresa" defaultValue={filters.empresa ?? ""} className="min-h-11 rounded-lg border border-line bg-surface px-2">
              <option value="">Todos</option>
              {d.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="block font-semibold">Projeto</span>
          <select name="projeto" defaultValue={filters.projeto ?? ""} className="min-h-11 rounded-lg border border-line bg-surface px-2">
            <option value="">Todos</option>
            {d.allProjects.map((p) => <option key={p.id} value={p.id}>{p.company} · {p.name}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded-lg border border-line px-4 font-semibold text-mauve hover:bg-tint">Aplicar</button>
        {(filters.empresa || filters.projeto) && (
          <Link href={`/${area}`} className="inline-flex min-h-11 items-center px-2 font-semibold text-mauve">Limpar</Link>
        )}
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Documentos recebidos" value={`${t.requests.receivedPct}%`} hint={`${t.requests.received} de ${t.requests.total} pedidos`} />
        <Stat label="Documentos aprovados" value={`${t.requests.approvedPct}%`} hint={`${t.requests.approved} de ${t.requests.total} pedidos`} />
        <Stat label="Aguardando análise" value={t.waitingReview} hint="enviados ou em análise" />
        <Stat label="Pedidos vencidos" value={t.overdueRequests} hint="prazo passou sem envio" />
        <Stat label="Ações concluídas" value={`${t.actionsDone} de ${t.actions}`} hint="sem contar canceladas" />
        <Stat label="Ações atrasadas" value={t.overdueActions} hint="prazo vencido" />
        <Stat label="Ações bloqueadas" value={t.blocked} />
        <Stat label="Projetos" value={d.projects.length} hint={`${new Set(d.projects.map((p) => p.company?.id)).size} cliente(s)`} />
      </div>

      {t.waitingReview > 0 && (
        <Link href={`/${area}/fila`} className="mb-6 flex min-h-11 items-center justify-between rounded-xl bg-tint px-4 py-3 font-semibold text-plum hover:bg-soft-rose/30">
          <span>{t.waitingReview} pedido(s) aguardando análise da consultoria</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Distribution
          title="Pedidos de informação por status"
          rows={Object.entries(REQUEST_STATUS).map(([k, v]) => ({ label: v.label, value: d.requestCounts[k] ?? 0 }))}
        />
        <Distribution
          title="Ações do plano por status"
          rows={Object.entries(ACTION_STATUS).map(([k, label]) => ({ label, value: d.actionCounts[k] ?? 0 }))}
        />
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-plum">Projetos</h2>
        {d.projects.length === 0 ? (
          <EmptyState>Nenhum projeto encontrado.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-tint text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Projeto</th>
                  <th className="px-3 py-2">Recebidos</th>
                  <th className="px-3 py-2">Aprovados</th>
                  <th className="px-3 py-2">Aguardando análise</th>
                  <th className="px-3 py-2">Ações concluídas</th>
                  <th className="px-3 py-2">Atrasadas</th>
                  <th className="px-3 py-2">Bloqueadas</th>
                </tr>
              </thead>
              <tbody>
                {d.projects.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      <Link href={`/${area}/projetos/${p.id}`} className="font-semibold text-ink hover:text-mauve">{p.name}</Link>
                      <p className="text-xs text-muted">{p.company?.trade_name}</p>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{p.requests.receivedPct}% <span className="text-muted">({p.requests.received}/{p.requests.total})</span></td>
                    <td className="px-3 py-2 tabular-nums">{p.requests.approvedPct}%</td>
                    <td className="px-3 py-2 tabular-nums">{p.waitingReview}</td>
                    <td className="px-3 py-2 tabular-nums">{p.actions.donePct}% <span className="text-muted">({p.actions.done}/{p.actions.total})</span></td>
                    <td className={`px-3 py-2 tabular-nums ${p.actions.overdue ? "font-semibold text-bad" : ""}`}>{p.actions.overdue}</td>
                    <td className="px-3 py-2 tabular-nums">{p.actions.blocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-plum">Encontros nos próximos 30 dias</h2>
          {d.meetings.length === 0 ? <p className="text-sm text-muted">Nenhum encontro agendado.</p> : (
            <ul className="space-y-2 text-sm">
              {d.meetings.map((m) => (
                <li key={m.id}>
                  <Link href={`/${area}/projetos/${m.project_id}/agenda`} className="hover:text-mauve">
                    <span className="font-semibold">{formatDate(m.scheduled_on)}{m.start_time ? ` · ${m.start_time.slice(0, 5)}` : ""}</span> · {m.title}
                    <span className="block text-xs text-muted">{m.project}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-plum">Marcos até 30 dias</h2>
          {d.milestones.length === 0 ? <p className="text-sm text-muted">Nenhum marco em aberto.</p> : (
            <ul className="space-y-2 text-sm">
              {d.milestones.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{formatDate(m.planned_on)}</span> · {m.name}
                  {m.late && <Badge tone="bad">Atrasado</Badge>}
                  <span className="block w-full text-xs text-muted">{m.project}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
