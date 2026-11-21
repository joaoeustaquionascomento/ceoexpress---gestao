import type { Metadata } from "next";
import { PublicShell } from "@/components/app-shell";
import { LoginForm } from "./login-form";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <h1 className="text-xl font-semibold text-plum">Entrar</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Acesse com o e-mail e a senha que você criou ao aceitar o convite.</p>
      {sp.senha === "redefinida" && (
        <div className="mb-4"><Alert tone="ok">Senha alterada. Entre com a nova senha.</Alert></div>
      )}
      {sp.erro === "link" && (
        <div className="mb-4"><Alert tone="bad">O link expirou ou já foi usado. Peça um novo.</Alert></div>
      )}
      <LoginForm next={sp.next} />
    </PublicShell>
  );
}
