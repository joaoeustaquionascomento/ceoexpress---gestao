import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Download do PDF de um contrato (gerado ou assinado). O banco só devolve o
 * contrato a quem pode vê-lo (RLS: administrador, ou o cliente quando o
 * contrato assinado foi liberado); então geramos um link de 5 minutos.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || (tipo !== "gerado" && tipo !== "assinado")) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/entrar", request.url));
  const { data: c } = await supabase.from("contracts").select("code, pdf_path, signed_path").eq("id", id).maybeSingle();
  const path = tipo === "gerado" ? c?.pdf_path : c?.signed_path;
  if (!c || !path) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  const name = `${c.code}${tipo === "assinado" ? "-assinado" : ""}.pdf`;
  const { data: signed } = await supabase.storage.from("contratos").createSignedUrl(path, 300, { download: name });
  if (!signed?.signedUrl) return new NextResponse("Arquivo indisponível no momento.", { status: 404 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
