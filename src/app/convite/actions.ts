"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkNewPassword } from "@/lib/password";
import { hashToken, isWellFormedToken } from "@/lib/tokens";
import type { FormState } from "../entrar/actions";

const GENERIC = "Este convite não é válido. Peça um novo link à CEOEXPRESS.";

/**
 * Aceite de convite. O token prova que a pessoa recebeu o link no e-mail
 * convidado; com ele, criamos a conta com a senha escolhida pela própria
 * pessoa. O vínculo com empresa e projeto é criado no banco por
 * accept_invitation, que valida de novo o token, o prazo, o uso único e o
 * e-mail da conta autenticada.
 */
export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const token = form.get("token");
  if (!isWellFormedToken(token)) return { error: GENERIC };
  const mode = form.get("mode") === "existente" ? "existente" : "novo";
  const fullName = z.string().trim().min(2).max(160).safeParse(form.get("full_name"));
  const password = String(form.get("password") ?? "");

  const admin = createAdminClient();
  const { data: inv, error: lookupError } = await admin
    .from("invitations")
    .select("id, email, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (lookupError) {
    // Normalmente é a chave secreta do Supabase ausente ou trocada na Vercel.
    console.error("[convite] falha ao consultar o convite com a chave secreta:", lookupError.message);
    return { error: "O servidor não conseguiu conferir o convite (configuração). Avise a CEOEXPRESS." };
  }
  if (!inv || inv.accepted_at || inv.revoked_at || new Date(inv.expires_at) < new Date()) return { error: `${GENERIC} (código C1)` };

  const supabase = await createClient();
  let createdUserId: string | null = null;

  if (mode === "novo") {
    if (!fullName.success) return { error: "Informe seu nome completo." };
    const problem = checkNewPassword(password, form.get("confirm"));
    if (problem) return { error: problem };
    const { data, error } = await admin.auth.admin.createUser({
      email: inv.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.data },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return { error: "Já existe uma conta com este e-mail. Use a opção \"Já tenho conta\"." };
      }
      console.error("[convite] falha ao criar a conta:", error.message);
      return { error: "Não foi possível criar a conta agora. Tente novamente em instantes. (código C4)" };
    }
    createdUserId = data.user.id;
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: inv.email, password });
  if (signInError) {
    console.error("[convite] falha ao entrar após criar a conta:", signInError.message);
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return { error: mode === "existente" ? "Senha incorreta para a conta deste convite." : `${GENERIC} (código C2)` };
  }

  const { error: acceptError } = await supabase.rpc("accept_invitation", {
    p_token: token,
    p_full_name: fullName.success ? fullName.data : "",
  });
  if (acceptError) {
    console.error("[convite] accept_invitation recusou:", acceptError.message);
    await supabase.auth.signOut();
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return { error: `${GENERIC} (código C3)` };
  }
  redirect("/");
}
