"use client";
import { useActionState } from "react";
import {
  addActionComment,
  addDecisionSteps,
  changeActionStatus,
  quickUpdateAction,
  saveAction,
  saveDecision,
  saveMeeting,
  saveMilestone,
} from "@/app/execucao/actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const STATUS_LABEL: Record<string, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function Feedback({ state }: { state: { error?: string; ok?: string } | undefined }) {
  return (
    <>
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
    </>
  );
}

function Field({ label, name, hint, children }: { label: string; name: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatusForm({
  actionId, projectId, current, staff, compact = false,
}: { actionId: string; projectId: string; current: string; staff: boolean; compact?: boolean }) {
  const [state, action] = useActionState(changeActionStatus, undefined);
  const options = Object.keys(STATUS_LABEL).filter((s) => s !== current && (staff || (s !== "cancelada" && current !== "cancelada")));
  if (options.length === 0) return null;
  const idp = compact ? `${actionId}-` : "";
  return (
    <form action={action} className="space-y-2" key={state?.ok}>
      <Feedback state={state} />
      <input type="hidden" name="actionId" value={actionId} />
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor={`${idp}status`} className={compact ? "sr-only" : labelClass}>Mudar status</label>
      <select id={`${idp}status`} name="status" required defaultValue="" className={inputClass}>
        <option value="" disabled>Mover para…</option>
        {options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      {!compact && (
        <>
          <label htmlFor="note" className={labelClass}>Observação</label>
          <textarea id="note" name="note" rows={2} className={inputClass} placeholder="Obrigatória ao marcar como bloqueada" />
        </>
      )}
      <SubmitButton pendingText="Salvando…">{compact ? "Mover" : "Atualizar status"}</SubmitButton>
    </form>
  );
}

export function ActionCommentForm({ actionId, staff, internalOnly }: { actionId: string; staff: boolean; internalOnly: boolean }) {
  const [state, action] = useActionState(addActionComment, undefined);
  return (
    <form action={action} className="space-y-3" key={state?.ok}>
      <Feedback state={state} />
      <input type="hidden" name="actionId" value={actionId} />
      <label htmlFor="body" className="sr-only">Mensagem</label>
      <textarea id="body" name="body" rows={3} required className={inputClass}
        placeholder={staff ? "Mensagem ao cliente ou nota interna" : "Escreva uma atualização ou dúvida para a consultoria"} />
      {staff && !internalOnly && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="internal" className="h-5 w-5 accent-[var(--plum)]" /> Nota interna (o cliente não vê)
        </label>
      )}
      <SubmitButton pendingText="Enviando…">Enviar mensagem</SubmitButton>
    </form>
  );
}

type Option = { id: string; label: string };
export type ActionDefaults = Partial<Record<string, string | null>> & { depends_on?: string[] };

export function ActionForm({
  area, projectId, actionId, defaults, people, objectives, otherActions,
}: {
  area: string;
  projectId: string;
  actionId?: string;
  defaults: ActionDefaults;
  people: { id: string; name: string; role: string }[];
  objectives: Option[];
  otherActions: Option[];
}) {
  const [state, action] = useActionState(saveAction, undefined);
  const v = (k: string) => defaults[k] ?? "";
  const depends = new Set(defaults.depends_on ?? []);
  const roleLabel: Record<string, string> = {
    consultant: "consultoria", client_manager: "gestor do cliente", client_member: "colaborador", client_viewer: "leitor",
  };
  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="projectId" value={projectId} />
      {actionId && <input type="hidden" name="actionId" value={actionId} />}

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold text-plum">Identificação</legend>
        <Field label="Código" name="code" hint="Em branco, o sistema numera (AP-12…)">
          <input id="code" name="code" defaultValue={v("code")} className={inputClass} maxLength={20} />
        </Field>
        <Field label="Tipo" name="kind">
          <select id="kind" name="kind" defaultValue={v("kind") || "acao_5w2h"} className={inputClass}>
            <option value="acao_5w2h">Ação 5W2H</option>
            <option value="tarefa">Tarefa</option>
            <option value="pendencia">Pendência</option>
          </select>
        </Field>
        <Field label="Prioridade" name="priority">
          <select id="priority" name="priority" defaultValue={v("priority") || "media"} className={inputClass}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </Field>
        <div className="sm:col-span-3">
          <Field label="Prioridade estratégica (objetivo)" name="objective_id">
            <select id="objective_id" name="objective_id" defaultValue={v("objective_id")} className={inputClass}>
              <option value="">Nenhuma</option>
              {objectives.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold text-plum">As 7 perguntas</legend>
        <Field label="1. O que precisa ser realizado?" name="title">
          <input id="title" name="title" required defaultValue={v("title")} className={inputClass} maxLength={300} />
        </Field>
        <Field label="2. Por que precisa ser realizado?" name="rationale">
          <textarea id="rationale" name="rationale" rows={2} defaultValue={v("rationale")} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="3. Quem executa?" name="executor_id" hint="Pessoa do projeto. Ela recebe um aviso.">
            <select id="executor_id" name="executor_id" defaultValue={v("executor_id")} className={inputClass}>
              <option value="">Ninguém definido</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({roleLabel[p.role] ?? p.role})</option>)}
            </select>
          </Field>
          <Field label="Executor por extenso" name="owner_label" hint="Ex.: Equipe financeira, enquanto a pessoa não tem acesso.">
            <input id="owner_label" name="owner_label" defaultValue={v("owner_label")} className={inputClass} maxLength={200} />
          </Field>
        </div>
        <Field label="De que lado é esta ação?" name="side" hint="Ajuda a separar o que a consultoria faz do que o cliente faz.">
          <select id="side" name="side" defaultValue={v("side")} className={inputClass}>
            <option value="">Não informado</option>
            <option value="consultoria">Consultoria</option>
            <option value="cliente">Cliente</option>
          </select>
        </Field>
        <Field label="4. Quem decide?" name="approver_id">
          <select id="approver_id" name="approver_id" defaultValue={v("approver_id")} className={inputClass}>
            <option value="">Não definido</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({roleLabel[p.role] ?? p.role})</option>)}
          </select>
        </Field>
        <Field label="5. Quais informações são necessárias?" name="decision_inputs">
          <textarea id="decision_inputs" name="decision_inputs" rows={2} defaultValue={v("decision_inputs")} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início" name="starts_on">
            <input id="starts_on" name="starts_on" type="date" defaultValue={v("starts_on")} className={inputClass} />
          </Field>
          <Field label="6. Quando deve ser concluído?" name="due_on">
            <input id="due_on" name="due_on" type="date" defaultValue={v("due_on")} className={inputClass} />
          </Field>
        </div>
        <Field label="7. Como será comprovado o resultado?" name="expected_evidence">
          <textarea id="expected_evidence" name="expected_evidence" rows={2} defaultValue={v("expected_evidence")} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold text-plum">Detalhes (5W2H)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Onde" name="area">
            <input id="area" name="area" defaultValue={v("area")} className={inputClass} maxLength={300} />
          </Field>
          <Field label="Quanto custa / recursos" name="resources">
            <input id="resources" name="resources" defaultValue={v("resources")} className={inputClass} maxLength={2000} />
          </Field>
        </div>
        <Field label="Como" name="how">
          <textarea id="how" name="how" rows={3} defaultValue={v("how")} className={inputClass} />
        </Field>
        <Field label="Critério de conclusão" name="completion_criteria">
          <textarea id="completion_criteria" name="completion_criteria" rows={2} defaultValue={v("completion_criteria")} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-semibold text-plum">Depende de</legend>
        {otherActions.length === 0 ? (
          <p className="text-sm text-muted">Não há outras ações no projeto.</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
            {otherActions.map((o) => (
              <label key={o.id} className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" name="depends_on" value={o.id} defaultChecked={depends.has(o.id)} className="h-5 w-5 accent-[var(--plum)]" />
                {o.label}
              </label>
            ))}
          </div>
        )}
        <Field label="Observação sobre dependências" name="dependency_note">
          <input id="dependency_note" name="dependency_note" defaultValue={v("dependency_note")} className={inputClass} maxLength={2000} />
        </Field>
      </fieldset>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="visibility" value="internal" defaultChecked={v("visibility") === "internal"} className="h-5 w-5 accent-[var(--plum)]" />
        Ação interna (o cliente não vê)
      </label>

      <SubmitButton pendingText="Salvando…">{actionId ? "Salvar alterações" : "Criar ação"}</SubmitButton>
    </form>
  );
}

export function MeetingForm({ projectId, meeting }: { projectId: string; meeting?: Record<string, unknown> }) {
  const [state, action] = useActionState(saveMeeting, undefined);
  const v = (k: string) => (meeting?.[k] as string | null | undefined) ?? "";
  const p = meeting ? `m-${String(meeting.id)}-` : "m-new-";
  return (
    <form action={action} className="space-y-3" key={meeting ? undefined : state?.ok}>
      <Feedback state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      {meeting && <input type="hidden" name="id" value={String(meeting.id)} />}
      <Field label="Título" name={`${p}title`}>
        <input id={`${p}title`} name="title" required defaultValue={v("title")} className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data" name={`${p}date`}>
          <input id={`${p}date`} name="scheduled_on" type="date" required defaultValue={v("scheduled_on")} className={inputClass} />
        </Field>
        <Field label="Horário" name={`${p}time`}>
          <input id={`${p}time`} name="start_time" type="time" defaultValue={v("start_time").slice(0, 5)} className={inputClass} />
        </Field>
      </div>
      <Field label="Pauta" name={`${p}agenda`}>
        <textarea id={`${p}agenda`} name="agenda" rows={2} defaultValue={v("agenda")} className={inputClass} />
      </Field>
      <Field label="Resultado esperado" name={`${p}out`}>
        <input id={`${p}out`} name="expected_output" defaultValue={v("expected_output")} className={inputClass} />
      </Field>
      {meeting && (
        <Field label="Ata (o que foi tratado e decidido)" name={`${p}min`}>
          <textarea id={`${p}min`} name="minutes" rows={4} defaultValue={v("minutes")} className={inputClass} />
        </Field>
      )}
      <div className="flex flex-wrap gap-4">
        {meeting && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="held" defaultChecked={meeting.held === true} className="h-5 w-5 accent-[var(--plum)]" /> Encontro realizado
          </label>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="internal" defaultChecked={meeting?.visibility === "internal"} className="h-5 w-5 accent-[var(--plum)]" /> Interno (o cliente não vê)
        </label>
      </div>
      <SubmitButton pendingText="Salvando…">{meeting ? "Salvar encontro" : "Agendar encontro"}</SubmitButton>
    </form>
  );
}

export function MilestoneForm({ projectId, milestone }: { projectId: string; milestone?: Record<string, unknown> }) {
  const [state, action] = useActionState(saveMilestone, undefined);
  const v = (k: string) => (milestone?.[k] as string | null | undefined) ?? "";
  const p = milestone ? `ms-${String(milestone.id)}-` : "ms-new-";
  return (
    <form action={action} className="space-y-3" key={milestone ? undefined : state?.ok}>
      <Feedback state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      {milestone && <input type="hidden" name="id" value={String(milestone.id)} />}
      <Field label="Marco" name={`${p}name`}>
        <input id={`${p}name`} name="name" required defaultValue={v("name")} className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Previsto para" name={`${p}planned`}>
          <input id={`${p}planned`} name="planned_on" type="date" required defaultValue={v("planned_on")} className={inputClass} />
        </Field>
        <Field label="Atingido em" name={`${p}achieved`}>
          <input id={`${p}achieved`} name="achieved_on" type="date" defaultValue={v("achieved_on")} className={inputClass} />
        </Field>
      </div>
      <SubmitButton pendingText="Salvando…">{milestone ? "Salvar marco" : "Criar marco"}</SubmitButton>
    </form>
  );
}

const KIND_OPTIONS: [string, string, string][] = [
  ["decisao", "Decisão", "Algo a decidir ou já decidido, como contratar uma ferramenta ou serviço."],
  ["proposta", "Proposta para avaliar", "Proposta recebida de fornecedor ou parceiro, para ler com calma e decidir depois."],
  ["alinhamento", "Alinhamento", "O que foi combinado numa reunião ou conselho, com os próximos passos de cada lado."],
  ["lacuna", "Lacuna", "Informação que falta e precisa ser apurada."],
  ["hipotese", "Hipótese", "Suposição a ser confirmada."],
  ["premissa", "Premissa", "Ponto de partida aceito por todos."],
];

/** Duas caixas de próximos passos: cada linha vira uma ação do plano (AP). */
function StepsFields({ p }: { p: string }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-semibold text-plum">Próximos passos (viram ações do plano)</legend>
      <p className="text-xs text-muted">Escreva um passo por linha. Cada linha vira uma ação (AP) ligada a este registro.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Field label="Da consultoria" name={`${p}sc`}>
            <textarea id={`${p}sc`} name="steps_consultoria" rows={3} className={inputClass} placeholder={"Ex.: Enviar a apresentação\nFormalizar a proposta"} />
          </Field>
          <Field label="Responsável na consultoria (opcional)" name={`${p}oc`}>
            <input id={`${p}oc`} name="steps_owner_consultoria" maxLength={200} className={inputClass} />
          </Field>
        </div>
        <div className="space-y-2">
          <Field label="Do cliente" name={`${p}scl`}>
            <textarea id={`${p}scl`} name="steps_cliente" rows={3} className={inputClass} placeholder={"Ex.: Treinar a equipe nos produtos\nGravar um vídeo da operação"} />
          </Field>
          <Field label="Responsável no cliente (opcional)" name={`${p}ocl`}>
            <input id={`${p}ocl`} name="steps_owner_cliente" maxLength={200} className={inputClass} />
          </Field>
        </div>
      </div>
      <Field label="Prazo dos passos (opcional)" name={`${p}sdue`}>
        <input id={`${p}sdue`} name="steps_due_on" type="date" className={inputClass} />
      </Field>
    </fieldset>
  );
}

export function DecisionForm({
  projectId, decision, meetings,
}: { projectId: string; decision?: Record<string, unknown>; meetings: { id: string; label: string }[] }) {
  const [state, action] = useActionState(saveDecision, undefined);
  const v = (k: string) => (decision?.[k] as string | null | undefined) ?? "";
  const p = decision ? `d-${String(decision.id)}-` : "d-new-";
  return (
    <form action={action} className="space-y-3" key={state?.ok}>
      <Feedback state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      {decision && <input type="hidden" name="id" value={String(decision.id)} />}
      <Field label="Tipo de registro" name={`${p}kind`}>
        <select id={`${p}kind`} name="kind" defaultValue={v("kind") || "decisao"} className={inputClass}>
          {KIND_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <ul className="space-y-0.5 text-xs text-muted">
        {KIND_OPTIONS.slice(0, 3).map(([value, label, hint]) => <li key={value}><span className="font-semibold">{label}:</span> {hint}</li>)}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Código" name={`${p}code`} hint="Em branco, o sistema numera (RG-01…).">
          <input id={`${p}code`} name="code" defaultValue={v("code")} className={inputClass} maxLength={20} />
        </Field>
        <Field label="Assunto" name={`${p}topic`} hint="Agrupa registros. Ex.: Vendas, Tecnologia.">
          <input id={`${p}topic`} name="topic" defaultValue={v("topic")} className={inputClass} maxLength={200} />
        </Field>
        <Field label="Situação" name={`${p}status`}>
          <select id={`${p}status`} name="status" defaultValue={v("status") || "aguardando"} className={inputClass}>
            <option value="aguardando">Aguardando</option>
            <option value="em_avaliacao">Em avaliação</option>
            <option value="a_apurar">A apurar</option>
            <option value="adiada">Adiada (no radar)</option>
            <option value="aprovada">Aprovada</option>
            <option value="rejeitada">Rejeitada</option>
            <option value="resolvida">Resolvida</option>
          </select>
        </Field>
      </div>
      <Field label="Resumo" name={`${p}summary`} hint="Uma ou duas linhas. Ex.: Contratar assinatura digital com integração ao sistema.">
        <textarea id={`${p}summary`} name="summary" rows={2} required defaultValue={v("summary")} className={inputClass} />
      </Field>
      <Field label="Texto completo" name={`${p}details`} hint="Pode colar aqui a mensagem, o e-mail ou o que foi combinado, do jeito que chegou.">
        <textarea id={`${p}details`} name="details" rows={5} defaultValue={v("details")} className={inputClass} maxLength={20000} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Link" name={`${p}link`} hint="Site da proposta, do fornecedor ou do documento.">
          <input id={`${p}link`} name="link_url" type="text" inputMode="url" defaultValue={v("link_url")} className={inputClass} maxLength={1000} placeholder="https://" />
        </Field>
        <Field label="Quem trouxe" name={`${p}source`} hint="Fornecedor, parceiro ou pessoa.">
          <input id={`${p}source`} name="source" defaultValue={v("source")} className={inputClass} maxLength={200} />
        </Field>
      </div>
      <Field label="Custo estimado ou condições" name={`${p}cost`} hint="Ex.: planos e valores, forma de pagamento, desconto pedido.">
        <textarea id={`${p}cost`} name="cost_note" rows={2} defaultValue={v("cost_note")} className={inputClass} maxLength={2000} />
      </Field>
      <Field label="Fundamento" name={`${p}basis`} hint="Por que decidir assim, ou o que pesa na avaliação.">
        <textarea id={`${p}basis`} name="basis" rows={2} defaultValue={v("basis")} className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Quem decide ou apura" name={`${p}by`}>
          <input id={`${p}by`} name="decided_by" defaultValue={v("decided_by")} className={inputClass} />
        </Field>
        <Field label="Prazo" name={`${p}due`}>
          <input id={`${p}due`} name="due_on" type="date" defaultValue={v("due_on")} className={inputClass} />
        </Field>
        <Field label="Revisar em" name={`${p}review`} hint="Para deixar no radar.">
          <input id={`${p}review`} name="review_on" type="date" defaultValue={v("review_on")} className={inputClass} />
        </Field>
        <Field label="Decidido em" name={`${p}on`}>
          <input id={`${p}on`} name="decided_on" type="date" defaultValue={v("decided_on")} className={inputClass} />
        </Field>
      </div>
      {meetings.length > 0 && (
        <Field label="Encontro em que foi tratado" name={`${p}meeting`}>
          <select id={`${p}meeting`} name="meeting_id" defaultValue={v("meeting_id")} className={inputClass}>
            <option value="">Nenhum</option>
            {meetings.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
      )}
      {!decision && <StepsFields p={p} />}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="internal" defaultChecked={decision ? decision.visibility === "internal" : true} className="h-5 w-5 accent-[var(--plum)]" /> Interno (o cliente não vê)
      </label>
      <p className="text-xs text-muted">As ações criadas pelos próximos passos seguem essa mesma opção: internas se o registro for interno.</p>
      <SubmitButton pendingText="Salvando…">{decision ? "Salvar registro" : "Criar registro"}</SubmitButton>
    </form>
  );
}

/** Acrescenta próximos passos (ações do plano) a um registro existente. */
export function DecisionStepsForm({ projectId, decisionId }: { projectId: string; decisionId: string }) {
  const [state, action] = useActionState(addDecisionSteps, undefined);
  return (
    <form action={action} className="space-y-3" key={state?.ok}>
      <Feedback state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="decisionId" value={decisionId} />
      <StepsFields p={`ds-${decisionId}-`} />
      <SubmitButton pendingText="Criando…">Criar ações no plano</SubmitButton>
    </form>
  );
}

export function QuickEdit({
  actionId, projectId, executorId, ownerLabel, dueOn, people,
}: {
  actionId: string;
  projectId: string;
  executorId: string | null;
  ownerLabel: string | null;
  dueOn: string | null;
  people: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(quickUpdateAction, undefined);
  return (
    <details className="group text-sm" open={!!state?.error}>
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-lg border border-line bg-surface px-3 font-semibold text-mauve hover:bg-tint [&::-webkit-details-marker]:hidden">
        <span aria-hidden>✎</span> Alterar quem executa e prazo
      </summary>
      <form action={action} className="mt-2 space-y-2 rounded-lg border border-line bg-surface p-3">
        <Feedback state={state} />
        <input type="hidden" name="actionId" value={actionId} />
        <input type="hidden" name="projectId" value={projectId} />
        <label htmlFor={`qe-${actionId}-ex`} className={labelClass}>Quem executa (pessoa com acesso ao projeto)</label>
        <select id={`qe-${actionId}-ex`} name="executor_id" defaultValue={executorId ?? ""} className={inputClass}>
          <option value="">Ninguém com acesso</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label htmlFor={`qe-${actionId}-ol`} className={labelClass}>Ou escreva o nome</label>
        <input id={`qe-${actionId}-ol`} name="owner_label" defaultValue={ownerLabel ?? ""} maxLength={200} placeholder="Ex.: Equipe financeira" className={inputClass} />
        <p className="text-xs text-muted">Use o nome escrito para quem ainda não tem acesso à plataforma. Se escolher uma pessoa acima, ela recebe um aviso.</p>
        <label htmlFor={`qe-${actionId}-due`} className={labelClass}>Prazo</label>
        <input id={`qe-${actionId}-due`} name="due_on" type="date" defaultValue={dueOn ?? ""} className={inputClass} />
        <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
      </form>
    </details>
  );
}
