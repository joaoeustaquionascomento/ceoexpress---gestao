/** Testes de terceiros registrados pelo mentor: só números, nenhum texto copiado. */

export type ExternalItem = { rotulo: string; valor: number; maximo: number };

/** Linhas "rótulo; valor; máximo" (máximo opcional, padrão 10). Devolve a mensagem de erro, se houver. */
export function parseItemLines(text: string): ExternalItem[] | string {
  const out: ExternalItem[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const parts = line.split(/[;\t]/).map((p) => p.trim());
    const rotulo = parts[0];
    const valor = Number((parts[1] ?? "").replace(",", "."));
    const maximo = parts[2] ? Number(parts[2].replace(",", ".")) : 10;
    if (!rotulo || parts[1] === undefined || parts[1] === "" || !Number.isFinite(valor) || !Number.isFinite(maximo) || maximo <= 0) {
      return `Linha ${i + 1} não entendida: use "nome; nota; máximo", por exemplo "Autocrítica; 7; 10".`;
    }
    out.push({ rotulo: rotulo.slice(0, 120), valor, maximo });
  }
  if (out.length > 40) return "No máximo 40 itens por teste.";
  return out;
}

/** Valor em porcentagem do máximo, para desenhar barras. */
export function percentOf(item: { valor: number; maximo: number }): number {
  return Math.max(0, Math.min(100, (item.valor / item.maximo) * 100));
}
