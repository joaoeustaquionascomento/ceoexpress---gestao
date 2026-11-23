/**
 * Marcação simples dos modelos de contrato, lida igual na prévia (tela) e no PDF.
 *
 *   # Título              título centralizado
 *   ## Cláusula           título de cláusula
 *   ### Subtítulo         subtítulo
 *   - item                item de lista
 *   a) item               item com letra (a), b), c)…)
 *   > texto               linha centralizada (ex.: local e data)
 *   ---                   quebra de página (ex.: antes do Anexo I)
 *   [[assinaturas]]       quadro de assinaturas
 *   **negrito**           negrito no meio do texto
 *
 * Parágrafos são separados por uma linha em branco.
 */

export type Span = { text: string; bold: boolean };
export type Block =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; spans: Span[] }
  | { kind: "bullet"; spans: Span[]; label?: string }
  | { kind: "center"; spans: Span[] }
  | { kind: "pagebreak" }
  | { kind: "signatures" };

export function spans(text: string): Span[] {
  const out: Span[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    const m = /^\*\*([^*]+)\*\*$/.exec(p);
    out.push(m ? { text: m[1], bold: true } : { text: p, bold: false });
  }
  return out;
}

const plain = (t: string) => t.replace(/\*\*/g, "");

export function parseBlocks(texto: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "paragraph", spans: spans(para.join(" ")) });
    para = [];
  };
  for (const raw of texto.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let m: RegExpExecArray | null;
    if (line === "---") { flush(); blocks.push({ kind: "pagebreak" }); }
    else if (line === "[[assinaturas]]") { flush(); blocks.push({ kind: "signatures" }); }
    else if ((m = /^###\s+(.+)$/.exec(line))) { flush(); blocks.push({ kind: "subheading", text: plain(m[1]) }); }
    else if ((m = /^##\s+(.+)$/.exec(line))) { flush(); blocks.push({ kind: "heading", text: plain(m[1]) }); }
    else if ((m = /^#\s+(.+)$/.exec(line))) { flush(); blocks.push({ kind: "title", text: plain(m[1]) }); }
    else if ((m = /^[-•*]\s+(.+)$/.exec(line))) { flush(); blocks.push({ kind: "bullet", spans: spans(m[1]) }); }
    else if ((m = /^([a-z]\))\s+(.+)$/.exec(line))) { flush(); blocks.push({ kind: "bullet", label: m[1], spans: spans(m[2]) }); }
    else if ((m = /^>\s*(.+)$/.exec(line))) { flush(); blocks.push({ kind: "center", spans: spans(m[1]) }); }
    else para.push(line);
  }
  flush();
  return blocks;
}

/** Quem assina, para o quadro de assinaturas. */
export type Signatories = {
  contratada: { nome: string; documento: string };
  contratante: { nome: string; documento: string };
  testemunhas: boolean;
};
