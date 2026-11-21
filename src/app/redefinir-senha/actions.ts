"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkNewPassword } from "@/lib/password";
import type { FormState } from "../entrar/actions";

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const problem = checkNewPassword(form.get("password"), form.get("confirm"));
  if (problem) return { error: problem };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "O link expirou. Peça um novo em \"Esqueci minha senha\"." };
  const { error } = await supabase.auth.updateUser({ password: String(form.get("password")) });
  if (error) return { error: "Não foi possível alterar a senha. Tente uma senha diferente." };
  // Encerra todas as sessões abertas com a senha antiga, inclusive esta.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/entrar?senha=redefinida");
}
