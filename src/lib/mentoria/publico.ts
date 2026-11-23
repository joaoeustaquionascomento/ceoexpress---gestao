import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, isWellFormedToken } from "@/lib/tokens";
import type { Answers } from "./pontuacao";
import { isInstrumentId, type InstrumentId } from "./tipos";

/**
 * Acesso do mentorado pelo link, sem login. O banco guarda só o hash do token;
 * aqui o servidor confere o token e usa a chave de serviço apenas para a
 * aplicação correspondente.
 */
export type PublicApplication = {
  id: string;
  instrument: InstrumentId;
  respondentFirstName: string;
  status: string;
  answers: Answers;
  consentAt: string | null;
  expiresAt: string | null;
};

export type TokenCheck =
  | { ok: true; app: PublicApplication }
  | { ok: false; reason: "invalido" | "expirado" | "respondido" | "cancelado" };

export async function findByToken(token: unknown): Promise<TokenCheck> {
  if (!isWellFormedToken(token)) return { ok: false, reason: "invalido" };
  const admin = createAdminClient();
  const { data } = await admin
    .from("assessment_applications")
    .select("id, instrument, respondent_name, status, answers, consent_at, expires_at, source")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.source !== "link" || !isInstrumentId(data.instrument)) return { ok: false, reason: "invalido" };
  if (data.status === "respondido") return { ok: false, reason: "respondido" };
  if (data.status === "cancelado") return { ok: false, reason: "cancelado" };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: "expirado" };
  return {
    ok: true,
    app: {
      id: data.id,
      instrument: data.instrument,
      respondentFirstName: String(data.respondent_name).trim().split(/\s+/)[0] ?? "",
      status: data.status,
      answers: (data.answers ?? {}) as Answers,
      consentAt: data.consent_at,
      expiresAt: data.expires_at,
    },
  };
}
