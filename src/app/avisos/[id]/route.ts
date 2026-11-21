import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Marca o aviso como lido e abre a tela a que ele se refere.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", request.url));
  let target = homeFor(user.role);
  if (/^[0-9a-f-]{36}$/.test(id)) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .select("link")
      .maybeSingle();
    // Só segue caminhos internos do próprio app.
    if (data?.link && data.link.startsWith("/") && !data.link.startsWith("//")) target = data.link;
  }
  return NextResponse.redirect(new URL(target, request.url));
}
