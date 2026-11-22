/**
 * Cálculo das notas e montagem do relatório das avaliações de mentoria.
 * Tudo por regras, sem IA. Funções puras: recebem respostas, devolvem notas.
 */
import type { Dimension, Instrument, Polarity } from "./tipos";

export type Answers = Record<string, number>;

/** Prefixo das respostas de "onde quero estar em 90 dias" (Roda da Vida). */
export const DESIRED_PREFIX = "desejo:";

export type DimScore = { id: string; label: string; score: number; desired?: number };
export type Scores = {
  version: number;
  dims: DimScore[];
  /** Média das dimensões, de 0 a 10. */
  overall: number;
  /** Mente a Favor: índice de 0 a 100. */
  index?: number;
};

export type BandKey = "critico" | "atencao" | "bom" | "forte" | "baixo" | "moderado" | "alto";
export type Band = { key: BandKey; label: string; tone: "ok" | "info" | "warn" | "bad"; needsWork: boolean };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Faixa de leitura de uma nota de 0 a 10. Verde é sempre bom, vermelho é sempre o que pede trabalho. */
export function bandOf(score: number, polarity: Polarity): Band {
  if (polarity === "competencia") {
    if (score < 4) return { key: "critico", label: "Crítico", tone: "bad", needsWork: true };
    if (score < 6) return { key: "atencao", label: "Atenção", tone: "warn", needsWork: true };
    if (score < 8) return { key: "bom", label: "Bom", tone: "info", needsWork: false };
    return { key: "forte", label: "Forte", tone: "ok", needsWork: false };
  }
  if (score < 4) return { key: "baixo", label: "Baixo", tone: "ok", needsWork: false };
  if (score < 6) return { key: "moderado", label: "Moderado", tone: "info", needsWork: false };
  if (score < 8) return { key: "alto", label: "Alto", tone: "warn", needsWork: true };
  return { key: "critico", label: "Crítico", tone: "bad", needsWork: true };
}

export function scaleRange(instr: Instrument): { min: number; max: number } {
  return instr.scale === "nota" ? { min: 0, max: 10 } : { min: 1, max: 5 };
}

/** Todas as chaves de resposta que a avaliação espera, na ordem em que aparecem. */
export function expectedKeys(instr: Instrument): string[] {
  const keys: string[] = [];
  for (const i of instr.index?.items ?? []) keys.push(i.id);
  for (const d of instr.dimensions) {
    for (const i of d.items) keys.push(i.id);
    if (instr.asksDesired) keys.push(DESIRED_PREFIX + d.id);
  }
  return keys;
}

/**
 * Limpa respostas vindas do navegador: só chaves conhecidas, só números
 * inteiros dentro da escala. Devolve também o que falta responder.
 */
export function sanitizeAnswers(instr: Instrument, raw: unknown): { answers: Answers; missing: string[] } {
  const { min, max } = scaleRange(instr);
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers: Answers = {};
  const missing: string[] = [];
  for (const key of expectedKeys(instr)) {
    const lo = key.startsWith(DESIRED_PREFIX) ? 0 : min;
    const hi = key.startsWith(DESIRED_PREFIX) ? 10 : max;
    const v = Number(src[key]);
    if (src[key] !== undefined && src[key] !== null && src[key] !== "" && Number.isInteger(v) && v >= lo && v <= hi) {
      answers[key] = v;
    } else {
      missing.push(key);
    }
  }
  return { answers, missing };
}

/** Converte a resposta de um item para 0 a 10, já invertendo itens escritos ao contrário. */
function itemTo10(instr: Instrument, value: number, reverse: boolean): number {
  if (instr.scale === "nota") return reverse ? 10 - value : value;
  const v = reverse ? 6 - value : value; // 5 vira 1, 4 vira 2...
  return ((v - 1) / 4) * 10;
}

function dimScore(instr: Instrument, d: Dimension, answers: Answers): number | null {
  const vals = d.items.filter((i) => answers[i.id] !== undefined).map((i) => itemTo10(instr, answers[i.id], !!i.reverse));
  if (vals.length === 0) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/**
 * Índice Mente a Favor: parte dos estados que ajudam sobre o total de estados
 * relatados (Nunca = 0 ... Sempre = 4). Sem nenhum estado relatado, 50.
 */
export function indexScore(instr: Instrument, answers: Answers): number | undefined {
  if (!instr.index) return undefined;
  let pos = 0;
  let neg = 0;
  for (const i of instr.index.items) {
    const v = answers[i.id];
    if (v === undefined) continue;
    if (i.positive) pos += v - 1;
    else neg += v - 1;
  }
  if (pos + neg === 0) return 50;
  return Math.round((pos / (pos + neg)) * 100);
}

export function computeScores(instr: Instrument, answers: Answers): Scores {
  const dims: DimScore[] = [];
  for (const d of instr.dimensions) {
    const s = dimScore(instr, d, answers);
    if (s === null) continue;
    const desired = answers[DESIRED_PREFIX + d.id];
    dims.push({ id: d.id, label: d.label, score: s, ...(instr.asksDesired && desired !== undefined ? { desired } : {}) });
  }
  const overall = dims.length ? round1(dims.reduce((a, b) => a + b.score, 0) / dims.length) : 0;
  const index = indexScore(instr, answers);
  return { version: instr.version, dims, overall, ...(index !== undefined ? { index } : {}) };
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

export type ReportDim = DimScore & {
  band: Band;
  description: string;
  reading: string;
  /** Variação desde a aplicação anterior (nota de agora menos a anterior). */
  delta?: number;
  previous?: number;
  /** Roda da Vida: quanto falta para a nota desejada. */
  gap?: number;
};

export type MentoringReport = {
  headline: string;
  overall: { score: number; band: Band; delta?: number };
  index?: { value: number; band: Band; delta?: number };
  /** Ordenadas da mais forte para a que mais pede trabalho. */
  dims: ReportDim[];
  strengths: ReportDim[];
  attention: ReportDim[];
  questions: { dim: string; text: string }[];
  actions: { dim: string; text: string }[];
};

/** Quanto "melhor" a dimensão está, para ordenar: competência alta ou risco baixo. */
function goodness(score: number, polarity: Polarity) {
  return polarity === "competencia" ? score : 10 - score;
}

export function buildReport(instr: Instrument, scores: Scores, previous?: Scores | null): MentoringReport {
  const prevById = new Map((previous?.dims ?? []).map((d) => [d.id, d.score]));
  const defById = new Map(instr.dimensions.map((d) => [d.id, d]));

  const dims: ReportDim[] = scores.dims
    .filter((s) => defById.has(s.id))
    .map((s) => {
      const def = defById.get(s.id)!;
      const band = bandOf(s.score, instr.polarity);
      const highReading = s.score >= 6;
      const prev = prevById.get(s.id);
      return {
        ...s,
        band,
        description: def.description,
        reading: highReading ? def.high : def.low,
        ...(prev !== undefined ? { previous: prev, delta: round1(s.score - prev) } : {}),
        ...(s.desired !== undefined ? { gap: round1(s.desired - s.score) } : {}),
      };
    })
    .sort((a, b) => goodness(b.score, instr.polarity) - goodness(a.score, instr.polarity) || a.label.localeCompare(b.label, "pt-BR"));

  const strengths = dims.filter((d) => !d.band.needsWork).slice(0, 3);
  const attention = [...dims].reverse().filter((d) => d.band.needsWork).slice(0, 3);
  // Roda da Vida: quando nenhuma área está baixa, as maiores distâncias até o desejado pedem atenção.
  if (instr.asksDesired && attention.length === 0) {
    attention.push(
      ...[...dims].filter((d) => (d.gap ?? 0) >= 2).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)).slice(0, 3),
    );
  }

  const work = dims.filter((d) => d.band.needsWork);
  const questions: MentoringReport["questions"] = [];
  const actions: MentoringReport["actions"] = [];
  for (const d of [...work].reverse()) {
    const def = defById.get(d.id)!;
    for (const q of def.questions) questions.push({ dim: d.label, text: q });
    actions.push({ dim: d.label, text: def.action });
  }
  if (instr.asksDesired && work.length === 0) {
    for (const d of attention) {
      const def = defById.get(d.id)!;
      questions.push({ dim: d.label, text: def.questions[0] });
      actions.push({ dim: d.label, text: def.action });
    }
  }

  const overallBand = bandOf(scores.overall, instr.polarity);
  const overallDelta = previous ? round1(scores.overall - previous.overall) : undefined;
  const index =
    scores.index !== undefined
      ? {
          value: scores.index,
          band: bandOf(scores.index / 10, "competencia"),
          ...(previous?.index !== undefined ? { delta: scores.index - previous.index } : {}),
        }
      : undefined;

  return {
    headline: headline(instr, dims, strengths, attention, index?.value),
    overall: { score: scores.overall, band: overallBand, ...(overallDelta !== undefined ? { delta: overallDelta } : {}) },
    ...(index ? { index } : {}),
    dims,
    strengths,
    attention,
    questions,
    actions,
  };
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

function headline(instr: Instrument, dims: ReportDim[], strengths: ReportDim[], attention: ReportDim[], index?: number): string {
  const parts: string[] = [];
  if (index !== undefined) parts.push(`Nos últimos 7 dias, sua mente esteve a seu favor em cerca de ${index}% do tempo.`);
  const fortes = strengths.map((d) => d.label);
  const atencao = attention.map((d) => d.label);
  if (instr.polarity === "competencia") {
    if (fortes.length) parts.push(`${fortes.length > 1 ? "Os pontos mais fortes são" : "O ponto mais forte é"} ${list(fortes)}.`);
    if (atencao.length) parts.push(`${atencao.length > 1 ? "Pedem mais atenção" : "Pede mais atenção"}: ${list(atencao)}.`);
    else if (dims.length) parts.push("Nenhuma dimensão ficou abaixo de 6.");
  } else {
    if (atencao.length) parts.push(`O que mais pesa hoje: ${list(atencao)}.`);
    else if (dims.length) parts.push("Nenhum item aparece em nível alto.");
    if (fortes.length) parts.push(`${fortes.length > 1 ? "Pesam pouco" : "Pesa pouco"}: ${list(fortes)}.`);
  }
  return parts.join(" ");
}
