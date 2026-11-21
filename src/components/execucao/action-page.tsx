import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BackLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { ActionCommentForm, ActionForm, StatusForm } from "@/components/execucao/forms";
import { getProjectAccess } from "@/lib/access";
import { formatDateTime } from "@/lib/queries";
import { ACTION_STATUS, formatDate } from "@/lib/status";
import {
  ACTION_KIND,
  PRIORITY,
  executorName,
  getActionDetail,
  getActionOptions,
  getProjectHeader,
  getProjectPeople,
  isOverdue,
  type Area,
} from "@/lib/execucao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function statusTone(s: string): "ok" | "bad" | "info" | "neutral" {
  return s === "concluida" ? "ok" : s === "bloqueada" ? "bad" : s === "em_andamento" ? "info" : "neutral";
}

function Answer({ n, q, children }: { n?: number; q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-canvas p-3">
      <dt className="text-sm font-semibold text-plum">{n ? `${n}. ` : ""}{q}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm">{children || <span className="text-muted">Não informado</span>}</dd>
    </div>
  );
}

export async function ActionPage({ area, params }: { area: Area; params: Promise<{ id: string; actionId: string }> }) {
  const { id, actionId } = await params;
  if (!UUID.test(id) || !UUID.test(actionId)) notFound();
  const [data, access] = await Promise.all([getActionDetail(actionId), getProjectAccess(id)]);
  if (!data || !access || data.action.project_id !== id) notFound();
  const { action: a, dependsOn, dependents, history, comments } = data;
  const base = `/${area}/projetos/${id}`;
  const text = (k: string) => (a[k] as string | null) ?? null;
  const canUpdate =
    access.staff ||
    (a.status !== "cancelada" && (access.role === "client_manager" || (access.role === "client_member" && a.executor_id === access.userId)));
  const openDeps = dependsOn.filter((d) => d.status !== "concluida" && d.status !== "cancelada");

  return (
    <>
      <BackLink href={`${base}/plano`} label="Voltar ao plano de ação" />
      <PageTitle eyebrow={`${a.code ?? "Ação"} · ${ACTION_KIND[a.kind] ?? a.kind}`} title={a.title}>
        <span className="flex flex-wrap gap-2">
          <Badge tone={statusTone(a.status)}>{ACTION_STATUS[a.status]}</Badge>
          <Badge tone={PRIORITY[a.priority]?.tone}>Prioridade {PRIORITY[a.priority]?.label.toLowerCase()}</Badge>
          {isOverdue(a) && <Badge tone="bad">Atrasada</Badge>}
          {a.visibility === "internal" && <Badge tone="warn">Interna</Badge>}
          {a.objective && <Badge tone="info">{a.objective.code} · {a.objective.name}</Badge>}
        </span>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-plum">As 7 perguntas</h2>
            <dl className="space-y-2">
              <Answer n={1} q="O que precisa ser realizado?">{a.title}</Answer>
              <Answer n={2} q="Por que precisa ser realizado?">{text("rationale")}</Answer>
              <Answer n={3} q="Quem executa?">{executorName(a)}</Answer>
              <Answer n={4} q="Quem decide?">{a.approver?.full_name ?? null}</Answer>
              <Answer n={5} q="Quais informações são necessárias?">{text("decision_inputs")}</Answer>
              <Answer n={6} q="Quando deve ser concluído?">
                {a.due_on ? `${formatDate(a.due_on)}${a.starts_on ? ` (início em ${formatDate(a.starts_on)})` : ""}` : null}
              </Answer>
              <Answer n={7} q="Como será comprovado o resultado?">{text("expected_evidence")}</Answer>
            </dl>
            <h3 className="mb-2 mt-5 font-semibold text-plum">Detalhes</h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Answer q="Onde">{text("area")}</Answer>
              <Answer q="Quanto custa / recursos">{text("resources")}</Answer>
              <Answer q="Como">{text("how")}</Answer>
              <Answer q="Critério de conclusão">{text("completion_criteria")}</Answer>
              {text("basis") && <Answer q="Base de referência">{text("basis")}</Answer>}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-plum">Dependências</h2>
            {dependsOn.length === 0 && dependents.length === 0 && !text("dependency_note") ? (
              <p className="text-sm text-muted">Esta ação não depende de outras.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {openDeps.length > 0 && (
                  <p className="rounded-lg bg-warn-bg px-3 py-2 text-warn">
                    Só pode ser concluída depois de {openDeps.length === 1 ? "1 ação" : `${openDeps.length} ações`} em aberto.
                  </p>
                )}
                {dependsOn.length > 0 && (
                  <div>
                    <p className="font-semibold">Depende de</p>
                    <ul className="mt-1 space-y-1">
                      {dependsOn.map((d) => (
                        <li key={d.id} className="flex flex-wrap items-center gap-2">
                          <Link href={`${base}/acoes/${d.id}`} className="font-semibold text-mauve hover:text-plum">{d.code ? `${d.code} · ` : ""}{d.title}</Link>
                          <Badge tone={statusTone(d.status)}>{ACTION_STATUS[d.status]}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {dependents.length > 0 && (
                  <div>
                    <p className="font-semibold">Ações que esperam por esta</p>
                    <ul className="mt-1 space-y-1">
                      {dependents.map((d) => (
                        <li key={d.id}>
                          <Link href={`${base}/acoes/${d.id}`} className="font-semibold text-mauve hover:text-plum">{d.code ? `${d.code} · ` : ""}{d.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {text("dependency_note") && <p className="text-muted">{text("dependency_note")}</p>}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-plum">Mensagens</h2>
            {comments.length === 0 ? (
              <p className="mb-4 text-sm text-muted">Nenhuma mensagem ainda.</p>
            ) : (
              <ul className="mb-4 space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className={`rounded-lg p-3 text-sm ${c.visibility === "internal" ? "bg-warn-bg" : "bg-canvas"}`}>
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-ink">{c.author?.full_name ?? "Usuário"}</span> · {formatDateTime(c.created_at)}
                      {c.visibility === "internal" && " · nota interna"}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {(access.staff || access.role !== "client_viewer") && (
              <ActionCommentForm actionId={a.id} staff={access.staff} internalOnly={a.visibility === "internal"} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {canUpdate && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-plum">Atualizar</h2>
              <StatusForm actionId={a.id} projectId={id} current={a.status} staff={access.staff} />
            </Card>
          )}
          {access.staff && (
            <Link href={`${base}/acoes/${a.id}/editar`} className="flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 font-semibold text-mauve hover:bg-tint">
              Editar ação
            </Link>
          )}
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-plum">Histórico</h2>
            {history.length === 0 ? (
              <EmptyState>Nenhuma mudança de status registrada.</EmptyState>
            ) : (
              <ol className="space-y-3 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-line pl-3">
                    <p className="text-xs text-muted">{formatDateTime(h.created_at)} · {h.author?.full_name ?? "Sistema"}</p>
                    <p className="font-semibold">
                      {h.status_from ? `${ACTION_STATUS[h.status_from]} → ` : ""}{ACTION_STATUS[h.status_to]}
                    </p>
                    {h.note && <p className="whitespace-pre-line text-muted">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

export async function ActionEditPage({
  area, params,
}: { area: Area; params: Promise<{ id: string; actionId?: string }> }) {
  const { id, actionId } = await params;
  if (!UUID.test(id) || (actionId && !UUID.test(actionId))) notFound();
  const [header, access, people, options, detail] = await Promise.all([
    getProjectHeader(id),
    getProjectAccess(id),
    getProjectPeople(id),
    getActionOptions(id),
    actionId ? getActionDetail(actionId) : Promise.resolve(null),
  ]);
  if (!header || !access?.staff) notFound();
  if (actionId && (!detail || detail.action.project_id !== id)) notFound();
  const base = `/${area}/projetos/${id}`;
  const a = detail?.action;
  const defaults: Record<string, string | null> & { depends_on?: string[] } = a
    ? Object.fromEntries(
        [
          "code", "kind", "objective_id", "title", "rationale", "area", "how", "priority", "executor_id", "owner_label",
          "approver_id", "decision_inputs", "starts_on", "due_on", "resources", "expected_evidence", "completion_criteria",
          "dependency_note", "visibility",
        ].map((k) => [k, (a[k] as string | null) ?? null]),
      )
    : {};
  if (detail) defaults.depends_on = detail.dependsOn.map((d) => d.id);

  return (
    <>
      <BackLink href={a ? `${base}/acoes/${a.id}` : `${base}/plano`} label="Voltar" />
      <PageTitle eyebrow={header.company?.trade_name} title={a ? `Editar ${a.code ?? "ação"}` : "Nova ação"}>
        Responda às 7 perguntas. O executor escolhido recebe um aviso no app.
      </PageTitle>
      <Card>
        <ActionForm
          area={area}
          projectId={id}
          actionId={a?.id}
          defaults={defaults}
          people={people}
          objectives={options.objectives.map((o) => ({ id: o.id, label: `${o.code} · ${o.name}` }))}
          otherActions={options.actions.filter((x) => x.id !== a?.id).map((x) => ({ id: x.id, label: `${x.code ? `${x.code} · ` : ""}${x.title}` }))}
        />
      </Card>
    </>
  );
}
