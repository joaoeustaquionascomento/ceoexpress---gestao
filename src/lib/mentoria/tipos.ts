/**
 * Tipos das avaliações de mentoria da CEOEXPRESS.
 *
 * Todo o conteúdo (perguntas, nomes de dimensões e textos de interpretação) é
 * original da CEOEXPRESS e genérico: nada amarrado a um cliente específico.
 */

/** "freq": frequência de 1 (Nunca) a 5 (Sempre). "nota": nota de 0 a 10. */
export type Scale = "freq" | "nota";

/**
 * "competencia": quanto maior a nota, melhor (verde no alto).
 * "risco": quanto maior a nota, mais aquilo pesa (vermelho no alto).
 */
export type Polarity = "competencia" | "risco";

export type Item = {
  id: string;
  text: string;
  /** Item escrito ao contrário: a resposta é invertida antes da média. */
  reverse?: boolean;
};

export type Dimension = {
  id: string;
  label: string;
  /** O que a dimensão mede, em uma frase. */
  description: string;
  items: Item[];
  /** Leitura quando a nota é alta (para "risco", alta = pesa muito). */
  high: string;
  /** Leitura quando a nota é baixa (para "risco", baixa = pesa pouco). */
  low: string;
  /** Duas perguntas para a próxima sessão, usadas quando a dimensão pede trabalho. */
  questions: [string, string];
  /** Uma ação prática sugerida, usada quando a dimensão pede trabalho. */
  action: string;
};

/** Item do Índice Mente a Favor: estado que ajuda (positive) ou atrapalha. */
export type IndexItem = { id: string; text: string; positive: boolean };

export type Instrument = {
  id: InstrumentId;
  version: number;
  name: string;
  /** Uma linha para listas. */
  summary: string;
  /** Texto de boas-vindas mostrado ao mentorado antes de começar. */
  intro: string;
  /** Instrução que aparece acima das perguntas. */
  instruction: string;
  scale: Scale;
  polarity: Polarity;
  dimensions: Dimension[];
  /** Roda da Vida: pergunta também a nota desejada em 90 dias por área. */
  asksDesired?: boolean;
  /** Mente a Favor: índice geral de 0 a 100 calculado à parte. */
  index?: { label: string; instruction: string; items: IndexItem[] };
  /** Tempo estimado para responder, em minutos. */
  minutes: number;
};

export const INSTRUMENT_IDS = [
  "roda_vida",
  "ie_lideranca",
  "barreiras_mudanca",
  "armadilhas_decisao",
  "perfil_empreendedor",
  "mente_a_favor",
] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

export function isInstrumentId(v: unknown): v is InstrumentId {
  return typeof v === "string" && (INSTRUMENT_IDS as readonly string[]).includes(v);
}
