"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirma o link de redefinição de senha pelo token_hash do e-mail.
 * Não depende do navegador em que o pedido foi feito (ao contrário do
 * fluxo PKCE), e só roda quando a pessoa clica no botão: robôs de
 * segurança do e-mail, que apenas abrem o link, não gastam o token.
 */
export async function confirmRecovery(form: FormData): Promise<void> {
  const tokenHash = String(form.get("token_hash") ?? "");
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash)) redirect("/entrar?erro=link");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) redirect("/entrar?erro=link");
  redirect("/redefinir-senha");
}
