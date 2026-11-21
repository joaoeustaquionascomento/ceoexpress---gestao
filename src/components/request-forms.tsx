"use client";
import { useActionState, useState, useTransition } from "react";
import { addComment, assignRequest, deleteDocument, restoreDocument, reviewRequest } from "@/app/pedidos/actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { UploadForm } from "@/components/upload-form";

export function ReviewForm({ requestId, current }: { requestId: string; current: string }) {
  const [state, action] = useActionState(reviewRequest, undefined);
  const options = [
    ["em_analise", "Iniciar análise"],
    ["aprovado", "Aprovar"],
    ["complementacao_solicitada", "Pedir complementação"],
    ["nao_aplicavel", "Não aplicável"],
    ["nao_iniciado", "Reabrir (não iniciado)"],
  ].filter(([v]) => v !== current);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
      <input type="hidden" name="requestId" value={requestId} />
      <div className="space-y-1">
        <label htmlFor="status" className={labelClass}>Decisão</label>
        <select id="status" name="status" required defaultValue="" className={inputClass}>
          <option value="" disabled>Selecione</option>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="message" className={labelClass}>Mensagem ao cliente</label>
        <textarea id="message" name="message" rows={3} className={inputClass} placeholder="Obrigatória ao pedir complementação" />
      </div>
      <SubmitButton pendingText="Salvando…">Registrar decisão</SubmitButton>
    </form>
  );
}

export function AssignForm({ requestId, current, people }: { requestId: string; current: string | null; people: { id: string; name: string }[] }) {
  const [state, action] = useActionState(assignRequest, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
      <input type="hidden" name="requestId" value={requestId} />
      <div className="space-y-1">
        <label htmlFor="assignee" className={labelClass}>Responsável no cliente</label>
        <select id="assignee" name="assignee" defaultValue={current ?? ""} className={inputClass}>
          <option value="">Ninguém (gestores do cliente veem)</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <SubmitButton pendingText="Salvando…">Salvar responsável</SubmitButton>
    </form>
  );
}

export function CommentForm({ requestId, staff }: { requestId: string; staff: boolean }) {
  const [state, action] = useActionState(addComment, undefined);
  return (
    <form action={action} className="space-y-3" key={state?.ok}>
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="body" className="sr-only">Mensagem</label>
      <textarea id="body" name="body" rows={3} required className={inputClass} placeholder={staff ? "Mensagem ao cliente ou nota interna" : "Escreva sua dúvida ou observação para a consultoria"} />
      {staff && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="internal" className="h-5 w-5 accent-[var(--plum)]" /> Nota interna (o cliente não vê)
        </label>
      )}
      <SubmitButton pendingText="Enviando…">Enviar mensagem</SubmitButton>
    </form>
  );
}

export function DocumentActions({
  documentId, requestId, projectId, deleted, canDelete, canRestore, canReplace, accepted,
}: {
  documentId: string; requestId: string; projectId: string; deleted: boolean;
  canDelete: boolean; canRestore: boolean; canReplace: boolean; accepted: string[];
}) {
  const [replacing, setReplacing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const btn = "min-h-10 rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint disabled:opacity-60";
  return (
    <div className="space-y-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {!deleted && canReplace && (
          <button type="button" className={btn} onClick={() => setReplacing((v) => !v)}>
            {replacing ? "Cancelar substituição" : "Substituir arquivo"}
          </button>
        )}
        {!deleted && canDelete && !confirm && (
          <button type="button" className={btn} onClick={() => setConfirm(true)}>Excluir</button>
        )}
        {!deleted && canDelete && confirm && (
          <>
            <span className="self-center text-sm text-muted">Excluir este arquivo?</span>
            <button
              type="button"
              disabled={pending}
              className="min-h-10 rounded-lg bg-bad px-3 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => start(async () => {
                const r = await deleteDocument(documentId, requestId, projectId);
                if (!r.ok) setError(r.error);
                setConfirm(false);
              })}
            >
              Sim, excluir
            </button>
            <button type="button" className={btn} onClick={() => setConfirm(false)}>Não</button>
          </>
        )}
        {deleted && canRestore && (
          <button
            type="button"
            disabled={pending}
            className={btn}
            onClick={() => start(async () => {
              const r = await restoreDocument(documentId, requestId, projectId);
              if (!r.ok) setError(r.error);
            })}
          >
            Recuperar documento
          </button>
        )}
      </div>
      {replacing && (
        <div className="rounded-lg border border-line p-4">
          <UploadForm requestId={requestId} accepted={accepted} checklist={[]} replaceDocumentId={documentId} onDone={() => setReplacing(false)} />
        </div>
      )}
    </div>
  );
}
