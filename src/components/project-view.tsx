import { Badge, Card, EmptyState, Stat } from "@/components/ui";
import { ACTION_STATUS, REQUEST_STATUS, formatDate, progress } from "@/lib/status";
import type { getProject, RequestRow } from "@/lib/queries";

const DECISION_KIND: Record<string, string> = { decisao: "Decisão", lacuna: "Lacuna", hipotese: "Hipótese", premissa: "Premissa" };

type Data = NonNullable<Awaited<ReturnType<typeof getProject>>>;

function RequestCard({ r }: { r: RequestRow }) {
  const st = REQUEST_STATUS[r.status];
  return (
    <details className="group rounded-xl border border-line bg-surface open:shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-rose">{r.code} · {r.category}</p>
          <p className="font-semibold text-ink">{r.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {r.visibility === "internal" && <Badge tone="warn">Interno</Badge>}
          <span>Prazo {formatDate(r.due_on)}</span>
          <Badge tone={st.tone === "info" ? "info" : st.tone === "ok" ? "ok" : st.tone === "warn" ? "warn" : "neutral"}>{st.label}</Badge>
        </div>
      </summary>
      <div className="space-y-4 border-t border-line p-4 text-sm leading-relaxed">
        <dl className="grid gap-3 sm:grid-cols-2">
          {r.description && (<div><dt className="font-semibold text-plum">O que enviar</dt><dd>{r.description}</dd></div>)}
          {r.purpose && (<div><dt className="font-semibold text-plum">Finalidade</dt><dd>{r.purpose}</dd></div>)}
          {r.minimum_content && (<div><dt className="font-semibold text-plum">Conteúdo mínimo</dt><dd>{r.minimum_content}</dd></div>)}
          {r.owner_label && (<div><dt className="font-semibold text-plum">Responsável</dt><dd>{r.owner_label}</dd></div>)}
          {r.examples && (<div><dt className="font-semibold text-plum">Exemplos</dt><dd>{r.examples}</dd></div>)}
          <div><dt className="font-semibold text-plum">Formatos aceitos</dt><dd>{r.accepted_formats.map((f) => f.toUpperCase()).join(", ")}</dd></div>
        </dl>
        {r.checklist.length > 0 && (
          <div>
            <h4 className="font-semibold text-plum">Itens solicitados</h4>
            <ol className="mt-2 space-y-2">
              {r.checklist.map((c, i) => (
                <li key={i} className="rounded-lg bg-canvas p-3">
                  <p className="font-semibold">{i + 1}. {c.item}</p>
                  {c.instrucao && <p className="mt-1 text-muted">{c.instrucao}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
        {r.instructions && (
          <div>
            <h4 className="font-semibold text-plum">Passo a passo para envio</h4>
            <p className="mt-1 whitespace-pre-line text-muted">{r.instructions}</p>
          </div>
        )}
        <p className="rounded-lg bg-tint px-3 py-2 text-xs text-plum">
          O envio de arquivos por esta tela entra na próxima etapa de desenvolvimento.
        </p>
      </div>
    </details>
  );
}

export function ProjectView({ data, audience }: { data: Data; audience: "staff" | "client" }) {
  const { requests, objectives, actions, meetings, decisions } = data;
  const p = progress(requests.map((r) => r.status));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = actions.filter((a) => a.status !== "concluida" && a.status !== "cancelada" && a.due_on && a.due_on < today).length;
  const done = actions.filter((a) => a.status === "concluida").length;
  const categories = [...new Set(requests.map((r) => r.category))];
  const objName = new Map(objectives.map((o) => [o.id, `${o.code} · ${o.name}`]));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Documentos recebidos" value={`${p.receivedPct}%`} hint={`${p.received} de ${p.total} pedidos`} />
        <Stat label="Documentos aprovados" value={`${p.approvedPct}%`} hint={`${p.approved} de ${p.total} pedidos`} />
        <Stat label="Pendências abertas" value={p.pending} hint="pedidos ainda não enviados" />
        <Stat label="Ações atrasadas" value={overdue} hint={`${done} de ${actions.length} concluídas`} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-plum">Informações solicitadas</h2>
        {requests.length === 0 ? (
          <EmptyState>Nenhuma solicitação cadastrada para este projeto.</EmptyState>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{cat}</h3>
                <div className="space-y-2">
                  {requests.filter((r) => r.category === cat).map((r) => <RequestCard key={r.id} r={r} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {objectives.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-plum">Prioridades e decisões</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {objectives.map((o) => (
              <Card key={o.id}>
                <p className="text-xs font-semibold text-rose">{o.code}</p>
                <h3 className="font-semibold text-plum">{o.name}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="font-semibold">Quem decide</dt><dd className="text-muted">{o.who_decides}</dd></div>
                  <div><dt className="font-semibold">Informações para decidir</dt><dd className="text-muted">{o.decision_inputs}</dd></div>
                  <div><dt className="font-semibold">Como verificar</dt><dd className="text-muted">{o.verification}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-plum">Plano de ação</h2>
        {actions.length === 0 ? (
          <EmptyState>Nenhuma ação cadastrada.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-tint text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Ação</th>
                  <th className="px-3 py-2">Prioridade</th>
                  <th className="px-3 py-2">Quem executa</th>
                  <th className="px-3 py-2">Prazo</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold">{a.code} · {a.title}</p>
                      {a.rationale && <p className="text-muted">{a.rationale}</p>}
                      {a.completion_criteria && <p className="mt-1 text-xs text-muted">Critério: {a.completion_criteria}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{a.objective_id ? objName.get(a.objective_id)?.split(" · ")[0] : "—"}</td>
                    <td className="px-3 py-2">{a.owner_label ?? "A definir"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(a.due_on)}</td>
                    <td className="px-3 py-2"><Badge tone={a.status === "concluida" ? "ok" : a.status === "bloqueada" ? "bad" : "neutral"}>{ACTION_STATUS[a.status] ?? a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-plum">Agenda</h2>
          {meetings.length === 0 ? <EmptyState>Nenhum encontro agendado.</EmptyState> : (
            <ol className="space-y-2">
              {meetings.map((m) => (
                <li key={m.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                  <p className="text-xs font-semibold text-rose">{formatDate(m.scheduled_on)}</p>
                  <p className="font-semibold">{m.title}</p>
                  {m.agenda && <p className="text-muted">{m.agenda}</p>}
                  {m.expected_output && <p className="mt-1 text-xs text-muted">Resultado esperado: {m.expected_output}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
        {audience === "staff" && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-plum">Registro de decisões</h2>
            {decisions.length === 0 ? <EmptyState>Nenhum registro.</EmptyState> : (
              <ul className="space-y-2">
                {decisions.map((d) => (
                  <li key={d.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                    <p className="text-xs font-semibold text-rose">{d.code} · {DECISION_KIND[d.kind] ?? d.kind} · {d.decided_by} · {formatDate(d.due_on)}</p>
                    <p className="font-semibold">{d.summary}</p>
                    {d.basis && <p className="text-muted">{d.basis}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
