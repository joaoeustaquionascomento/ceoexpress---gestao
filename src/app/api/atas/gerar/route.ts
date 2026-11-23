import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getProjectAccess } from "@/lib/access";
import { MINUTES_SCHEMA, MINUTES_SYSTEM, blankMinutes, isEmptyMinutes, minutesUserPrompt, normalizeMinutes, type MinutesContent } from "@/lib/atas/conteudo";
import { maskPersonalData } from "@/lib/atas/privacidade";
import { minutesFromDocument, minutesFromTranscript } from "@/lib/atas/transcricao";
import { AiError, aiConfigured, runStructured } from "@/lib/relatorios/ia";
import { formatDate } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

// Com IA, uma reunião longa pode levar alguns minutos.
export const maxDuration = 300;

/** Transcrição de até ~4 horas de reunião. */
const MAX_CHARS = 400_000;

const body = z.object({
  projectId: z.string().uuid(),
  meetingId: z.string().uuid(),
  area: z.enum(["admin", "consultor"]),
  // regras: transcrição lida sem IA · importar: ata pronta · branco: modelo vazio · ia: escrita pela IA
  mode: z.enum(["regras", "importar", "branco", "ia"]),
  text: z.string().max(MAX_CHARS, "O texto passa do limite (cerca de 4 horas de reunião). Divida em partes.").default(""),
});

/** Limite de atas com IA por projeto em 24 horas, para conter custo por engano. */
const DAILY_AI_LIMIT = 20;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail("Origem não permitida.", 403);

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Pedido inválido.");
  const { projectId, meetingId, area, mode } = parsed.data;
  const text = parsed.data.text.trim();
  if (mode !== "branco" && text.length < 30) return fail("Cole o texto ou escolha um arquivo antes de continuar.");

  const access = await getProjectAccess(projectId);
  if (!access?.staff) return fail("Só a consultoria monta atas.", 403);
  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, scheduled_on, agenda, minutes")
    .eq("id", meetingId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!meeting) return fail("Encontro não encontrado.", 404);

  let content: MinutesContent;
  let engine: "manual" | "regras" | "importada" | "ia";
  let model: string | null = null;
  let usage: unknown = null;
  let note: string | null = null;

  if (mode === "branco") {
    content = blankMinutes(meeting.agenda);
    engine = "manual";
  } else if (mode === "importar") {
    content = minutesFromDocument(text, meeting);
    engine = "importada";
  } else if (mode === "regras") {
    const r = minutesFromTranscript(text, meeting);
    content = r.content;
    engine = "regras";
    note = `Li ${r.stats.falas} trechos de fala e ${r.stats.participantes} participantes.`;
  } else {
    if (!aiConfigured()) return fail("A ata com IA ainda não está ligada.", 503);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from("meeting_minutes")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("engine", "ia")
      .gte("updated_at", since);
    if ((count ?? 0) >= DAILY_AI_LIMIT) return fail(`Limite de ${DAILY_AI_LIMIT} atas com IA por projeto em 24 horas atingido.`, 429);
    try {
      const r = await runStructured({
        system: MINUTES_SYSTEM,
        user: minutesUserPrompt({ titulo: meeting.title, data: formatDate(meeting.scheduled_on), pauta: meeting.agenda }, maskPersonalData(text)),
        schema: MINUTES_SCHEMA as unknown as Record<string, unknown>,
      });
      content = normalizeMinutes(r.json);
      model = r.model;
      usage = r.usage;
    } catch (e) {
      if (e instanceof AiError) return fail(e.message, 502);
      console.error("atas: falha na IA", e);
      return fail("Não foi possível escrever a ata. Tente de novo.", 500);
    }
    if (isEmptyMinutes(content)) return fail("A IA devolveu uma ata vazia. Confira o texto e tente de novo.", 502);
    engine = "ia";
  }

  // Ata digitada antes no campo simples do encontro não se perde.
  const { data: existing } = await supabase.from("meeting_minutes").select("id").eq("meeting_id", meetingId).maybeSingle();
  if (!existing && meeting.minutes?.trim()) {
    content.assuntos.push({ titulo: "Anotações registradas antes", texto: meeting.minutes.trim() });
  }

  // Uma ata por encontro: refazer substitui o conteúdo e volta para rascunho.
  const { error } = await supabase.from("meeting_minutes").upsert(
    {
      project_id: projectId,
      meeting_id: meetingId,
      content,
      engine,
      status: "rascunho",
      model,
      usage,
      reviewed_by: null,
      reviewed_at: null,
      created_by: access.userId,
    },
    { onConflict: "meeting_id" },
  );
  if (error) {
    console.error("atas: falha ao salvar", error.message);
    return fail("A ata foi montada, mas não foi possível salvá-la. Tente de novo.", 500);
  }
  // Enquanto é rascunho, o cliente não vê a ata no encontro.
  await supabase.from("meetings").update({ minutes: null }).eq("id", meetingId).eq("project_id", projectId);

  for (const a of ["admin", "consultor", "cliente"]) revalidatePath(`/${a}/projetos/${projectId}`, "layout");
  return NextResponse.json({ href: `/${area}/projetos/${projectId}/agenda/${meetingId}/ata?editar=1`, note });
}
