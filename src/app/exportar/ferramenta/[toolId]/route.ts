import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { slugify, toCsv } from "@/lib/csv";
import { isToolKind, toolTable } from "@/lib/ferramentas";
import { createClient } from "@/lib/supabase/server";

/** CSV de uma ferramenta. A RLS decide se o usuário pode vê-la. */
export async function GET(_req: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(toolId)) {
    return new NextResponse("Não encontrado.", { status: 404 });
  }
  if (!(await getSessionUser())) return new NextResponse("Entre no sistema para exportar.", { status: 401 });
  const supabase = await createClient();
  const { data: t } = await supabase.from("strategy_tools").select("kind, title, data").eq("id", toolId).maybeSingle();
  if (!t || !isToolKind(t.kind)) return new NextResponse("Não encontrado.", { status: 404 });
  const { header, rows } = toolTable(t.kind, t.data);
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(t.title)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
