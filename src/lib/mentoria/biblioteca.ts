/** Biblioteca de livros e filmes: sugestões por regras a partir do relatório. */
import { INSTRUMENTS } from "./instrumentos";
import type { InstrumentId } from "./tipos";

export type LibraryItem = {
  id: string;
  kind: "livro" | "filme";
  title: string;
  author: string | null;
  year: number | null;
  tags: string[];
  note: string | null;
  active: boolean;
};

export const THEMES: { key: string; label: string }[] = [
  ...Object.values(INSTRUMENTS).map((i) => ({ key: i.id, label: i.name })),
  { key: "tema:lideranca", label: "Liderança, comunicação e equipes" },
];

/** Rótulo legível de uma etiqueta ("ie_lideranca:empatia" → "Inteligência Emocional na Liderança: Empatia"). */
export function tagLabel(tag: string): string {
  if (tag === "tema:lideranca") return "Liderança e equipes";
  const [inst, dim] = tag.split(":");
  const instr = INSTRUMENTS[inst as InstrumentId];
  if (!instr) return tag;
  if (dim === "indice") return `${instr.name}: índice geral`;
  const d = instr.dimensions.find((x) => x.id === dim);
  return d ? `${instr.name}: ${d.label}` : instr.name;
}

/** Todas as etiquetas válidas, para o formulário da biblioteca. */
export function allTags(): { tag: string; label: string }[] {
  const out: { tag: string; label: string }[] = [];
  for (const instr of Object.values(INSTRUMENTS)) {
    if (instr.index) out.push({ tag: `${instr.id}:indice`, label: `${instr.name}: índice geral` });
    for (const d of instr.dimensions) out.push({ tag: `${instr.id}:${d.id}`, label: `${instr.name}: ${d.label}` });
  }
  out.push({ tag: "tema:lideranca", label: "Liderança e equipes" });
  return out;
}

/**
 * Até `perDim` itens por dimensão que pede trabalho, sem repetir título,
 * alternando livro e filme quando possível. `dims` em ordem de prioridade.
 */
export function suggestReadings(
  library: LibraryItem[],
  instrument: InstrumentId,
  dims: string[],
  opts: { perDim?: number; max?: number; includeIndex?: boolean } = {},
): { dim: string; item: LibraryItem }[] {
  const perDim = opts.perDim ?? 2;
  const max = opts.max ?? 8;
  const used = new Set<string>();
  const out: { dim: string; item: LibraryItem }[] = [];
  const keys = [...(opts.includeIndex ? ["indice"] : []), ...dims];
  for (const dim of keys) {
    const tag = `${instrument}:${dim}`;
    const matches = library
      .filter((l) => l.active && l.tags.includes(tag) && !used.has(l.id))
      // Mais específicos primeiro (menos etiquetas), depois livros antes de filmes, depois título.
      .sort((a, b) => a.tags.length - b.tags.length || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, "pt-BR"));
    const pick: LibraryItem[] = [];
    const book = matches.find((m) => m.kind === "livro");
    const film = matches.find((m) => m.kind === "filme");
    if (book) pick.push(book);
    if (film && pick.length < perDim) pick.push(film);
    for (const m of matches) if (pick.length < perDim && !pick.includes(m)) pick.push(m);
    for (const p of pick) {
      used.add(p.id);
      out.push({ dim, item: p });
    }
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}
