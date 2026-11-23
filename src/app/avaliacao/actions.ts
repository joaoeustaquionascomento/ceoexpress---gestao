"use server";
import { INSTRUMENTS } from "@/lib/mentoria/instrumentos";
import { computeScores, sanitizeAnswers } from "@/lib/mentoria/pontuacao";
import { findByToken } from "@/lib/mentoria/publico";
import { createAdminClient } from "@/lib/supabase/admin";

export type AnswerResult = { ok?: boolean; done?: boolean; error?: string; missing?: number };

const REASONS: Record<string, string> = {
  invalido: "Este link não é válido. Peça um novo link ao seu mentor.",
  expirado: "Este link expirou. Peça um novo link ao seu mentor.",
  respondido: "Esta avaliação já foi enviada. Obrigado!",
  cancelado: "Esta avaliação foi cancelada pelo mentor.",
};

/**
 * Salva as respostas do mentorado (rascunho) ou envia de vez.
 * Só aceita chaves e valores da própria avaliação.
 */
export async function saveAnswers(token: string, raw: unknown, consent: boolean, submit: boolean): Promise<AnswerResult> {
  const check = await findByToken(token);
  if (!check.ok) return { error: REASONS[check.reason] };
  const { app } = check;
  if (!consent && !app.consentAt) return { error: "Para continuar, aceite o termo de uso das suas respostas." };
  const instr = INSTRUMENTS[app.instrument];
  const merged = { ...app.answers, ...(raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) };
  const { answers, missing } = sanitizeAnswers(instr, merged);
  if (submit && missing.length > 0) return { error: `Faltam ${missing.length} resposta(s). Volte e complete antes de enviar.`, missing: missing.length };

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("assessment_applications")
    .update({
      answers,
      consent_at: app.consentAt ?? now,
      ...(app.status === "enviado" ? { status: "em_andamento", started_at: now } : {}),
      ...(submit
        ? { status: "respondido", submitted_at: now, scores: computeScores(instr, answers) }
        : {}),
    })
    .eq("id", app.id)
    .in("status", ["enviado", "em_andamento"]);
  if (error) {
    console.error("saveAnswers", error.code, error.message);
    return { error: "Não foi possível salvar agora. Tente de novo em instantes." };
  }
  return { ok: true, done: submit };
}
