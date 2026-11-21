"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "./actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? "/"} />
      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className={labelClass}>Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      <p className="text-sm">
        <Link href="/esqueci-senha" className="font-semibold text-mauve hover:text-plum">Esqueci minha senha</Link>
      </p>
    </form>
  );
}
