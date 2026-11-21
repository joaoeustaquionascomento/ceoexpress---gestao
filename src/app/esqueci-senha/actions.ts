"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { FormState } from "../entrar/actions";

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Informe um e-mail válido." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?next=/redefinir-senha`,
  });
  // Mesma resposta exista ou não a conta.
  return { ok: "Se houver uma conta com este e-mail, você receberá um link válido por 1 hora." };
}
