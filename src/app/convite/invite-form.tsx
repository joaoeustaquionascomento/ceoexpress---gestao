"use client";
import { useActionState, useState } from "react";
import { acceptInvite } from "./actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function InviteForm({ token, emailHint }: { token: string; emailHint: string }) {
  const [state, action] = useActionState(acceptInvite, undefined);
  const [mode, setMode] = useState<"novo" | "existente">("novo");
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="mode" value={mode} />
      <p className="text-sm text-muted">
        Convite para <strong className="text-ink">{emailHint}</strong>.
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-tint p-1 text-sm font-semibold" role="tablist">
        {(["novo", "existente"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-md ${mode === m ? "bg-surface text-plum shadow-sm" : "text-muted"}`}
          >
            {m === "novo" ? "Criar minha conta" : "Já tenho conta"}
          </button>
        ))}
      </div>
      {mode === "novo" && (
        <div className="space-y-1">
          <label htmlFor="full_name" className={labelClass}>Nome completo</label>
          <input id="full_name" name="full_name" autoComplete="name" required className={inputClass} />
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="password" className={labelClass}>{mode === "novo" ? "Crie uma senha" : "Sua senha"}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "novo" ? "new-password" : "current-password"}
          required
          minLength={mode === "novo" ? 10 : 1}
          className={inputClass}
        />
        {mode === "novo" && <p className="text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>}
      </div>
      {mode === "novo" && (
        <div className="space-y-1">
          <label htmlFor="confirm" className={labelClass}>Repita a senha</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
        </div>
      )}
      <SubmitButton pendingText="Confirmando…">{mode === "novo" ? "Criar conta e entrar" : "Entrar e aceitar convite"}</SubmitButton>
    </form>
  );
}
