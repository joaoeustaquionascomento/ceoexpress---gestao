import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

/** Recebe o link de e-mail do Supabase (redefinição de senha) e abre a sessão. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  // Sem "code": o link veio no formato implicit, com a sessão depois do "#".
  // O navegador mantém esse trecho no redirecionamento, e a página de
  // confirmação o lê no próprio navegador.
  if (!code && !request.nextUrl.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/auth/confirmar", request.url));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
}
