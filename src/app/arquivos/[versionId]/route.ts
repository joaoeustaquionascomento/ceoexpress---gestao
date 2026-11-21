import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Download de uma versão: o banco só devolve a versão se o usuário puder vê-la
 * (RLS); então geramos um link assinado de 5 minutos para o arquivo privado.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(versionId)) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/entrar", request.url));
  const { data: v } = await supabase
    .from("document_versions")
    .select("storage_path, file_name")
    .eq("id", versionId)
    .maybeSingle();
  if (!v) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  const { data: signed } = await supabase.storage
    .from("documentos")
    .createSignedUrl(v.storage_path, 300, { download: v.file_name });
  if (!signed?.signedUrl) return new NextResponse("Arquivo indisponível no momento.", { status: 404 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
