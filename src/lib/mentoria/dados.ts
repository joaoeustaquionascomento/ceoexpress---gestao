import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LibraryItem } from "./biblioteca";
import type { Answers, Scores } from "./pontuacao";

/** Validade do link de resposta. */
export const LINK_DAYS = 30;

export const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "info" | "warn" | "ok" | "bad" }> = {
  enviado: { label: "Enviado", tone: "neutral" },
  em_andamento: { label: "Respondendo", tone: "info" },
  respondido: { label: "Respondido", tone: "ok" },
  cancelado: { label: "Cancelado", tone: "bad" },
};

export type ExternalResult = {
  principal?: { rotulo: string; valor: number; maximo: number } | null;
  itens?: { rotulo: string; valor: number; maximo: number }[];
  link?: string | null;
};

export type Application = {
  id: string;
  project_id: string;
  instrument: string;
  instrument_version: number;
  source: "link" | "externo" | "importado";
  title: string | null;
  respondent_name: string;
  respondent_email: string | null;
  respondent_id: string | null;
  expires_at: string | null;
  status: string;
  answers: Answers;
  scores: Scores | null;
  external: ExternalResult | null;
  applied_on: string | null;
  consent_at: string | null;
  submitted_at: string | null;
  mentor_comment: string | null;
  released_at: string | null;
  created_at: string;
};

const COLS =
  "id, project_id, instrument, instrument_version, source, title, respondent_name, respondent_email, respondent_id, expires_at, status, answers, scores, external, applied_on, consent_at, submitted_at, mentor_comment, released_at, created_at";

/** Aplicações do projeto que o usuário pode ver (o banco filtra). Mais novas primeiro. */
export async function listApplications(projectId: string): Promise<Application[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment_applications")
    .select(COLS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Application[];
}

export async function getApplication(projectId: string, id: string): Promise<Application | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("assessment_applications").select(COLS).eq("project_id", projectId).eq("id", id).maybeSingle();
  return (data as Application | null) ?? null;
}

/** Data em que a avaliação vale (resposta, ou data informada para externos e importados). */
export function appliedDate(a: Pick<Application, "applied_on" | "submitted_at" | "created_at">): string {
  return a.applied_on ?? (a.submitted_at ?? a.created_at).slice(0, 10);
}

/**
 * Aplicação anterior do mesmo instrumento para a mesma pessoa, já respondida,
 * para comparar a evolução.
 */
export function previousOf(all: Application[], current: Application): Application | null {
  const key = (a: Application) => (a.respondent_id ?? a.respondent_name.trim().toLowerCase());
  const mine = all
    .filter(
      (a) =>
        a.id !== current.id &&
        a.instrument === current.instrument &&
        a.status === "respondido" &&
        a.scores &&
        key(a) === key(current) &&
        appliedDate(a) <= appliedDate(current),
    )
    .sort((a, b) => appliedDate(b).localeCompare(appliedDate(a)) || b.created_at.localeCompare(a.created_at));
  return mine[0] ?? null;
}

export async function listLibrary(): Promise<LibraryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mentoring_library").select("id, kind, title, author, year, tags, note, active").order("title");
  return (data ?? []) as LibraryItem[];
}

export function isMentoriaKind(kind: string | null | undefined): boolean {
  return !!kind && /mentoria/i.test(kind);
}
