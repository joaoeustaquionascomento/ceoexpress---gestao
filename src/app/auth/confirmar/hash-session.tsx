"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Link de redefinição no formato padrão do Supabase: a sessão chega depois
 * do "#" do endereço, que só o navegador enxerga. Aqui ela é gravada nos
 * cookies e a pessoa segue para escolher a nova senha.
 */
export function HashSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "invalid">("checking");

  useEffect(() => {
    async function run(): Promise<boolean> {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      // Tira os tokens da barra de endereço e do histórico.
      window.history.replaceState(null, "", window.location.pathname);
      if (params.get("type") !== "recovery" || !accessToken || !refreshToken) return false;
      const { error } = await createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return !error;
    }
    run().then((ok) => (ok ? router.replace("/redefinir-senha") : setState("invalid")));
  }, [router]);

  if (state === "checking") return <p className="mt-4 text-sm text-muted">Conferindo o link…</p>;
  return <>{children}</>;
}
