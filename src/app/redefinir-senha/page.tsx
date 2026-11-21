"use client";
import { useActionState } from "react";
import { PublicShell } from "@/components/app-shell";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword } from "./actions";

export default function RedefinirSenhaPage() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <PublicShell>
      <h1 className="text-xl font-semibold text-plum">Nova senha</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Mínimo de 10 caracteres, com letras e números.</p>
      <form action={action} className="space-y-4">
        {state?.error && <Alert tone="bad">{state.error}</Alert>}
        <div className="space-y-1">
          <label htmlFor="password" className={labelClass}>Nova senha</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm" className={labelClass}>Repita a nova senha</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
        </div>
        <SubmitButton pendingText="Salvando…">Salvar nova senha</SubmitButton>
      </form>
    </PublicShell>
  );
}
