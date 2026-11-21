import { notFound } from "next/navigation";
import { Badge, BackLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { DecisionForm, MeetingForm, MilestoneForm } from "@/components/execucao/forms";
import { getProjectAccess } from "@/lib/access";
import { formatDate } from "@/lib/status";
import { DECISION_KIND, DECISION_STATUS, getAgenda, getProjectHeader, today, type Area } from "@/lib/execucao";

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
  const { meetings, milestones, decisions } = await getAgenda(id);
  const base = `/${area}/projetos/${id}`;
  const staff = access.staff;
  const now = today();
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
              {m.minutes && (
                <div className="mt-2 rounded-lg bg-canvas p-3 text-sm">
                  <p className="font-semibold text-plum">Ata</p>
                  <p className="whitespace-pre-line">{m.minutes}</p>
                </div>
              )}
              {staff && <EditBox label="Editar ou registrar a ata"><MeetingForm projectId={id} meeting={m} /></EditBox>}
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
          <h2 className="text-lg font-semibold text-plum">Registro de decisões</h2>
          {!staff && <p className="text-sm text-muted">Decisões, lacunas, hipóteses e premissas que a consultoria compartilhou com você.</p>}
          {decisions.length === 0 && <EmptyState>Nenhum registro.</EmptyState>}
          {decisions.map((d) => (
            <div key={d.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="text-xs font-semibold text-rose">
                {d.code ? `${d.code} · ` : ""}{DECISION_KIND[d.kind] ?? d.kind}
                {d.decided_by ? ` · ${d.decided_by}` : ""}
                {d.due_on ? ` · prazo ${formatDate(d.due_on)}` : ""}
              </p>
              <p className="font-semibold">{d.summary}</p>
              {d.basis && <p className="text-muted">{d.basis}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone={d.status === "aprovada" || d.status === "resolvida" ? "ok" : d.status === "rejeitada" ? "bad" : "neutral"}>
                  {DECISION_STATUS[d.status] ?? d.status}{d.decided_on ? ` em ${formatDate(d.decided_on)}` : ""}
                </Badge>
                {d.visibility === "internal" && <Badge tone="warn">Interno</Badge>}
              </div>
              {staff && <EditBox label="Editar registro"><DecisionForm projectId={id} decision={d} meetings={meetingOptions} /></EditBox>}
            </div>
          ))}
          {staff && <EditBox label="Novo registro"><DecisionForm projectId={id} meetings={meetingOptions} /></EditBox>}
        </section>
      </div>
    </>
  );
}
