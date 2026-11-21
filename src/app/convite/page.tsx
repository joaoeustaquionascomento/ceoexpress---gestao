import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { isWellFormedToken } from "@/lib/tokens";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Convite" };

const reasons: Record<string, string> = {
  utilizado: "Este convite já foi utilizado. Entre com seu e-mail e senha.",
  expirado: "Este convite expirou. Peça um novo link à CEOEXPRESS.",
  invalido: "Este convite não é válido. Peça um novo link à CEOEXPRESS.",
};

export default async function ConvitePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token, chave } = await searchParams;

  // Links do portal antigo (/convite?chave=...) não dão mais acesso.
  if (!token && chave) {
    return (
      <PublicShell>
        <h1 className="text-xl font-semibold text-plum">Área do Cliente</h1>
        <div className="mt-4">
          <Alert tone="warn">
            O acesso por senha compartilhada foi substituído por contas individuais. Peça à CEOEXPRESS um novo convite
            para o seu e-mail.
          </Alert>
        </div>
      </PublicShell>
    );
  }

  let preview: { valid: boolean; email_hint: string | null; reason: string | null } | null = null;
  if (isWellFormedToken(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("invitation_preview", { p_token: token });
    preview = Array.isArray(data) ? data[0] : null;
  }

  return (
    <PublicShell>
      <h1 className="text-xl font-semibold text-plum">Bem-vindo à CEOEXPRESS</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Confirme seu acesso criando uma senha pessoal.</p>
      {preview?.valid && token ? (
        <InviteForm token={token} emailHint={preview.email_hint ?? ""} />
      ) : (
        <div className="space-y-4">
          <Alert tone="bad">{reasons[preview?.reason ?? "invalido"] ?? reasons.invalido}</Alert>
          <Link href="/entrar" className="text-sm font-semibold text-mauve">Ir para o login</Link>
        </div>
      )}
    </PublicShell>
  );
}
