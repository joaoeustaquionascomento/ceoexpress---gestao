"use client";
import { useActionState } from "react";
import { PublicShell } from "@/components/app-shell";
import { Alert, BackLink, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requestReset } from "./actions";

export default function EsqueciSenhaPage() {
  const [state, action] = useActionState(requestReset, undefined);
  return (
    <PublicShell>
      <BackLink href="/entrar" label="Voltar ao login" />
      <h1 className="text-xl font-semibold text-plum">Redefinir senha</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Enviaremos um link de uso único para o seu e-mail.</p>
      <form action={action} className="space-y-4">
        {state?.error && <Alert tone="bad">{state.error}</Alert>}
        {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </div>
        <SubmitButton pendingText="Enviando…">Enviar link</SubmitButton>
      </form>
    </PublicShell>
  );
}
