export const REQUEST_STATUS = {
  nao_iniciado: { label: "Não iniciado", tone: "neutral" },
  em_preenchimento: { label: "Em preenchimento", tone: "neutral" },
  enviado: { label: "Enviado", tone: "info" },
  em_analise: { label: "Em análise", tone: "info" },
  complementacao_solicitada: { label: "Complementação solicitada", tone: "warn" },
  aprovado: { label: "Aprovado", tone: "ok" },
  nao_aplicavel: { label: "Não aplicável", tone: "neutral" },
} as const;

export type RequestStatus = keyof typeof REQUEST_STATUS;

/** Status que o próprio cliente pode definir (o restante é da consultoria). */
export const CLIENT_SETTABLE: readonly RequestStatus[] = ["em_preenchimento", "enviado"];

/** Espelha a regra do banco (guard_info_request_update) para a interface. */
export function clientCanSetStatus(from: RequestStatus, to: RequestStatus): boolean {
  if (!CLIENT_SETTABLE.includes(to)) return false;
  return !["aprovado", "nao_aplicavel", "em_analise"].includes(from);
}

/** "Recebido" conta tudo que já chegou; "aprovado" só o validado. */
export function progress(statuses: RequestStatus[]) {
  const applicable = statuses.filter((s) => s !== "nao_aplicavel");
  const received = applicable.filter((s) =>
    ["enviado", "em_analise", "complementacao_solicitada", "aprovado"].includes(s),
  ).length;
  const approved = applicable.filter((s) => s === "aprovado").length;
  const pct = (n: number) => (applicable.length ? Math.round((n / applicable.length) * 100) : 0);
  return {
    total: applicable.length,
    received,
    approved,
    pending: applicable.length - received,
    receivedPct: pct(received),
    approvedPct: pct(approved),
  };
}

export const ACTION_STATUS: Record<string, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Sem prazo";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
