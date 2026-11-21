/**
 * Subitens de um pedido no formulário: um por linha, com orientação opcional
 * depois de "::". Ex.: "Extratos recentes :: dos últimos 3 meses, em PDF".
 */

export type ChecklistItem = { item: string; instrucao: string | null };

export function parseChecklist(text: string): ChecklistItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      const [item, ...rest] = line.split("::");
      const instrucao = rest.join("::").trim();
      return { item: item.trim().slice(0, 300), instrucao: instrucao ? instrucao.slice(0, 2000) : null };
    })
    .filter((c) => c.item);
}

export function formatChecklist(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((c) => {
      const item = typeof c?.item === "string" ? c.item : "";
      const inst = typeof c?.instrucao === "string" && c.instrucao ? ` :: ${c.instrucao}` : "";
      return item ? `${item}${inst}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

/** Formatos aceitos: "pdf, xlsx .docx" -> ["pdf","xlsx","docx"]. */
export function parseFormats(text: string): string[] {
  const list = text
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((f) => f.replace(/^\./, "").replace(/[^a-z0-9]/g, ""))
    .filter((f) => f.length >= 2 && f.length <= 6);
  const unique = [...new Set(list)].slice(0, 20);
  return unique.length ? unique : ["pdf"];
}

export const DEFAULT_FORMATS = "pdf, xlsx, xls, docx, doc, pptx, csv, png, jpg";

/** Pastas do Drive/arquivos usadas pelos pedidos. */
export const FOLDERS: Record<string, string> = {
  "01_DOCUMENTOS_INSTITUCIONAIS": "01 · Documentos institucionais",
  "02_FINANCEIRO": "02 · Financeiro",
  "03_COMERCIAL": "03 · Comercial",
  "04_OPERACIONAL": "04 · Operacional",
  "05_RECURSOS_HUMANOS": "05 · Recursos humanos",
  "06_PLANEJAMENTO_ESTRATEGICO": "06 · Planejamento estratégico",
  "09_ENTREGAVEIS": "09 · Entregáveis",
};
