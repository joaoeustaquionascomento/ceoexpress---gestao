"use server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { FormState } from "../entrar/actions";

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Informe um e-mail válido." };
  // Fluxo "implicit": o link do e-mail traz a sessão no próprio endereço e
  // funciona em qualquer navegador, inclusive com o modelo de e-mail padrão
  // do Supabase (o fluxo PKCE exigiria abrir no mesmo navegador do pedido).
  const env = publicEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/redefinir-senha`,
  });
  // Mesma resposta exista ou não a conta.
  return { ok: "Se houver uma conta com este e-mail, você receberá um link válido por 1 hora." };
}
