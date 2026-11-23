/**
 * Códigos dos itens do projeto: PI-01, PI-02… para pedidos de informação e
 * AP-01, AP-02… para ações do plano e RG-01, RG-02… para o registro de
 * decisões, propostas e alinhamentos. Aceita também os códigos antigos (D01, A01)
 * ao calcular o próximo número.
 */
export const CODE_PREFIX = { pedido: "PI", acao: "AP", registro: "RG" } as const;
type Prefix = (typeof CODE_PREFIX)[keyof typeof CODE_PREFIX];

const LEGACY: Record<Prefix, string> = { PI: "D", AP: "A", RG: "RG" };

export function nextCode(prefix: Prefix, codes: (string | null | undefined)[]): string {
  const re = new RegExp(`^(?:${prefix}-?|${LEGACY[prefix]})(\\d{1,4})$`, "i");
  const max = codes.reduce((m, c) => {
    const n = re.exec((c ?? "").trim());
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}
