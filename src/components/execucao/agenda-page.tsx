import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BackLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { DecisionForm, DecisionStepsForm, MeetingForm, MilestoneForm } from "@/components/execucao/forms";
import { getProjectAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import { ACTION_STATUS } from "@/lib/status";
import { DECISION_KIND, DECISION_STATUS, SIDE, getAgenda, getProjectHeader, today, type Area } from "@/lib/execucao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function EditBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mt-2 rounded-lg border border-line bg-canvas px-3">
      <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-mauve">{label}</summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

export async function AgendaPage({ area, params }: { area: Area; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(id), getProjectAccess(id)]);
  if (!header || !access) notFound();
  const { meetings, milestones, decisions, stepsByDecision } = await getAgenda(id);
  const base = `/${area}/projetos/${id}`;
  const staff = access.staff;
  const now = today();
  // Atas estruturadas (o banco só devolve ao cliente as revisadas).
  const supabase = await createClient();
  const { data: minutesRows } = await supabase.from("meeting_minutes").select("meeting_id, status").eq("project_id", id);
  const minutesBy = new Map((minutesRows ?? []).map((r) => [r.meeting_id as string, r.status as string]));
  const meetingOptions = meetings.map((m) => ({ id: m.id, label: `${formatDate(m.scheduled_on)} · ${m.title}` }));

  return (
    <>
      <BackLink href={`${base}/plano`} label="Voltar ao plano de ação" />
      <PageTitle eyebrow={header.company?.trade_name} title="Agenda e decisões">
        {header.name}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-plum">Encontros</h2>
          {meetings.length === 0 && <EmptyState>Nenhum encontro agendado.</EmptyState>}
          {meetings.map((m) => (
            <Card key={m.id} className="!p-4">
              <p className="text-xs font-semibold text-rose">
                {formatDate(m.scheduled_on)}{m.start_time ? ` · ${m.start_time.slice(0, 5)}` : ""}
              </p>
              <p className="font-semibold">{m.title}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.held ? <Badge tone="ok">Realizado</Badge> : m.scheduled_on < now ? <Badge tone="warn">Sem registro</Badge> : <Badge tone="info">Agendado</Badge>}
                {m.visibility === "internal" && <Badge tone="warn">Interno</Badge>}
              </div>
              {m.agenda && <p className="mt-2 text-sm text-muted">{m.agenda}</p>}
              {m.expected_output && <p className="mt-1 text-xs text-muted">Resultado esperado: {m.expected_output}</p>}
              {minutesBy.has(m.id) ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link href={`${base}/agenda/${m.id}/ata`} className="inline-flex min-h-11 items-center rounded-lg bg-tint px-4 text-sm font-semibold text-plum hover:bg-canvas">
                    Ver ata
                  </Link>
                  {staff && <Badge tone={minutesBy.get(m.id) === "revisada" ? "ok" : "warn"}>{minutesBy.get(m.id) === "revisada" ? "Ata revisada" : "Ata em rascunho"}</Badge>}
                </div>
              ) : (
                <>
                  {m.minutes && (
                    <div className="mt-2 rounded-lg bg-canvas p-3 text-sm">
                      <p className="font-semibold text-plum">Ata</p>
                      <p className="whitespace-pre-line">{m.minutes}</p>
                    </div>
                  )}
                  {staff && (
                    <Link href={`${base}/agenda/${m.id}/ata`} className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-mauve hover:bg-tint">
                      Montar ata pela transcrição
                    </Link>
                  )}
                </>
              )}
              {staff && <EditBox label="Editar encontro"><MeetingForm projectId={id} meeting={m} structuredMinutes={minutesBy.has(m.id)} /></EditBox>}
            </Card>
          ))}
          {staff && <EditBox label="Agendar novo encontro"><MeetingForm projectId={id} /></EditBox>}

          <h2 className="pt-4 text-lg font-semibold text-plum">Marcos</h2>
          {milestones.length === 0 && <EmptyState>Nenhum marco cadastrado.</EmptyState>}
          {milestones.length > 0 && (
            <ol className="space-y-2">
              {milestones.map((ms) => (
                <li key={ms.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{ms.name}</p>
                    {ms.achieved_on ? (
                      <Badge tone="ok">Atingido em {formatDate(ms.achieved_on)}</Badge>
                    ) : ms.planned_on < now ? (
                      <Badge tone="bad">Atrasado</Badge>
                    ) : (
                      <Badge tone="info">Previsto</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted">Previsto para {formatDate(ms.planned_on)}</p>
                  {staff && <EditBox label="Editar marco"><MilestoneForm projectId={id} milestone={ms} /></EditBox>}
                </li>
              ))}
            </ol>
          )}
          {staff && <EditBox label="Criar novo marco"><MilestoneForm projectId={id} /></EditBox>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-plum">Decisões, propostas e alinhamentos</h2>
          <p className="text-sm text-muted">
            {staff
              ? "Registre propostas recebidas para avaliar, o que foi combinado em reuniões e o que falta decidir. Os próximos passos viram ações do plano."
              : "Decisões, propostas e alinhamentos que a consultoria compartilhou com você."}
          </p>
          {staff && <EditBox label="Novo registro"><DecisionForm projectId={id} meetings={meetingOptions} /></EditBox>}
          {decisions.length === 0 && (
            <EmptyState>{staff ? "Nenhum registro." : "A consultoria ainda não compartilhou nenhum registro com você."}</EmptyState>
          )}
          {decisions.map((d) => {
            const steps = stepsByDecision[d.id] ?? [];
            const reviewDue = d.review_on && d.review_on <= now && !["aprovada", "rejeitada", "resolvida"].includes(d.status);
            return (
              <div key={d.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="text-xs font-semibold text-rose">
                  {d.code ? `${d.code} · ` : ""}{DECISION_KIND[d.kind] ?? d.kind}
                  {d.topic ? ` · ${d.topic}` : ""}
                  {d.decided_by ? ` · ${d.decided_by}` : ""}
                  {d.due_on ? ` · prazo ${formatDate(d.due_on)}` : ""}
                </p>
                <p className="font-semibold">{d.summary}</p>
                {d.source && <p className="text-muted">Trazido por: {d.source}</p>}
                {d.link_url && (
                  <p>
                    <a href={d.link_url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-mauve hover:text-plum">
                      Abrir link ↗
                    </a>
                  </p>
                )}
                {d.cost_note && <p className="mt-1 whitespace-pre-line text-muted">Custo ou condições: {d.cost_note}</p>}
                {d.basis && <p className="mt-1 text-muted">{d.basis}</p>}
                {d.details && (
                  <details className="mt-2 rounded-lg bg-canvas px-3">
                    <summary className="min-h-10 cursor-pointer py-2 font-semibold text-plum">Texto completo</summary>
                    <p className="whitespace-pre-line pb-3">{d.details}</p>
                  </details>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone={d.status === "aprovada" || d.status === "resolvida" ? "ok" : d.status === "rejeitada" ? "bad" : d.status === "em_avaliacao" ? "info" : "neutral"}>
                    {DECISION_STATUS[d.status] ?? d.status}{d.decided_on ? ` em ${formatDate(d.decided_on)}` : ""}
                  </Badge>
                  {d.review_on && (
                    <Badge tone={reviewDue ? "warn" : "neutral"}>{reviewDue ? "Hora de revisar" : `Revisar em ${formatDate(d.review_on)}`}</Badge>
                  )}
                  {d.visibility === "internal" && <Badge tone="warn">Interno</Badge>}
                </div>
                {steps.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Próximos passos no plano</p>
                    <ul className="mt-1 space-y-1">
                      {steps.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2">
                          <Link href={`${base}/acoes/${s.id}`} className="font-semibold text-ink hover:text-mauve">
                            {s.code ? `${s.code} · ` : ""}{s.title}
                          </Link>
                          {s.side && <Badge tone="neutral">{SIDE[s.side] ?? s.side}</Badge>}
                          <Badge tone={s.status === "concluida" ? "ok" : s.status === "bloqueada" ? "bad" : "neutral"}>
                            {ACTION_STATUS[s.status as keyof typeof ACTION_STATUS] ?? s.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {staff && (
                  <>
                    <EditBox label="Acrescentar próximos passos"><DecisionStepsForm projectId={id} decisionId={d.id} /></EditBox>
                    <EditBox label="Editar registro"><DecisionForm projectId={id} decision={d} meetings={meetingOptions} /></EditBox>
                  </>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
