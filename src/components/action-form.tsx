"use client";
import { useActionState, useRef, useEffect } from "react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type State = { error?: string; ok?: string; link?: string } | undefined;

/** Formulário com retorno visual de sucesso/erro para ações de servidor. */
export function ActionForm({
  action,
  submit,
  pending,
  children,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  submit: string;
  pending?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
      {state?.link && (
        <div className="space-y-1 rounded-lg border border-line bg-canvas p-3 text-sm">
          <p className="font-semibold text-plum">Link do convite (exibido só agora; copie e envie ao convidado):</p>
          <input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-line bg-surface px-2 py-1 font-mono text-xs" />
        </div>
      )}
      {children}
      <SubmitButton pendingText={pending ?? "Salvando…"}>{submit}</SubmitButton>
    </form>
  );
}
