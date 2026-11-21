"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Informe e-mail e senha." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensagem única para não revelar se o e-mail existe.
  if (error) return { error: "E-mail ou senha incorretos. Confira e tente novamente." };
  redirect(safeNext(form.get("next")));
}
