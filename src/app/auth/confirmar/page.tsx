import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { confirmRecovery } from "./actions";
import { HashSession } from "./hash-session";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ConfirmarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token_hash: tokenHash, type } = await searchParams;
  const valid = type === "recovery" && typeof tokenHash === "string" && tokenHash.length > 0;
  return (
    <PublicShell>
      <h1 className="text-xl font-semibold text-plum">Redefinir senha</h1>
      {valid ? (
        <form action={confirmRecovery} className="mt-4 space-y-4">
          <p className="text-sm text-muted">Clique para continuar e escolher sua nova senha.</p>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <SubmitButton pendingText="Conferindo…">Continuar</SubmitButton>
        </form>
      ) : (
        <HashSession>
          <div className="mt-4">
            <Alert tone="bad">Este link não é válido ou já foi usado. Peça um novo em “Esqueci minha senha”.</Alert>
          </div>
        </HashSession>
      )}
    </PublicShell>
  );
}
