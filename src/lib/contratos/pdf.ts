import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import serifBold from "./fontes/serif-bold";
import serifRegular from "./fontes/serif-regular";
import { parseBlocks, type Signatories, type Span } from "./markup";

/**
 * Gera o PDF do contrato a partir do texto final (já com os campos trocados).
 * A fonte (Liberation Serif, licença OFL) vai embutida no arquivo, para o
 * contrato aparecer igual em qualquer leitor de PDF e no assinador do gov.br;
 * caracteres que ela não tem viram equivalentes simples.
 */

const A4 = { w: 595.28, h: 841.89 };
const M = { top: 72, bottom: 72, left: 70, right: 70 };
const WIDTH = A4.w - M.left - M.right;
const SIZE = 11;
const LEADING = 15;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.4, 0.4, 0.45);

const TROCAS: Record<string, string> = {
  "‐": "-", "‑": "-", "‒": "-", "−": "-", " ": " ", " ": " ", " ": " ",
  "′": "'", "″": '"', "≤": "<=", "≥": ">=", "→": "->", "✓": "x", "✔": "x",
};

function makeSanitizer(fonts: PDFFont[]) {
  const sets = fonts.map((f) => new Set(f.getCharacterSet()));
  const has = (ch: string) => sets.every((set) => set.has(ch.codePointAt(0)!));
  return (text: string) => {
    let out = "";
    for (const ch of text) {
      if (TROCAS[ch] !== undefined) { out += TROCAS[ch]; continue; }
      if (has(ch)) { out += ch; continue; }
      const simple = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      out += simple && [...simple].every(has) ? simple : "?";
    }
    return out;
  };
}

const fromBase64 = (b64: string) => Uint8Array.from(Buffer.from(b64, "base64"));

type Word = { text: string; bold: boolean; width: number; space: boolean };

export async function contractPdf(texto: string, sig: Signatories, meta: { title: string; code: string; createdAt: Date }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(meta.title);
  pdf.setSubject(`Contrato ${meta.code}`);
  pdf.setProducer("CEOEXPRESS | Gestão Estratégica");
  pdf.setCreator("CEOEXPRESS | Gestão Estratégica");
  pdf.setCreationDate(meta.createdAt);
  pdf.setModificationDate(meta.createdAt);
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fromBase64(serifRegular), { subset: true });
  const bold = await pdf.embedFont(fromBase64(serifBold), { subset: true });
  const clean = makeSanitizer([regular, bold]);

  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M.top;
  const newPage = () => { page = pdf.addPage([A4.w, A4.h]); y = A4.h - M.top; };
  const need = (h: number) => { if (y - h < M.bottom) newPage(); };

  const font = (b: boolean) => (b ? bold : regular);

  function words(ss: Span[], size: number, forceBold = false): Word[] {
    const out: Word[] = [];
    for (const s of ss) {
      const b = forceBold || s.bold;
      const t = clean(s.text);
      const parts = t.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        if (/^\s+$/.test(p)) { if (out.length) out[out.length - 1].space = true; continue; }
        out.push({ text: p, bold: b, width: font(b).widthOfTextAtSize(p, size), space: false });
      }
    }
    return out;
  }

  /** Quebra em linhas e desenha; justify estica os espaços (menos na última linha). */
  function drawWords(ws: Word[], opts: { size: number; x: number; width: number; align: "left" | "justify" | "center"; leading: number }) {
    const spaceW = regular.widthOfTextAtSize(" ", opts.size);
    const lines: Word[][] = [];
    let cur: Word[] = [];
    let curW = 0;
    // "space" diz se há espaço depois da palavra (não há entre "**Nome**" e a vírgula seguinte).
    const sep = (prev: Word | undefined) => (prev && prev.space ? spaceW : 0);
    for (const w of ws) {
      const add = sep(cur[cur.length - 1]) + w.width;
      if (cur.length && curW + add > opts.width) { lines.push(cur); cur = []; curW = 0; }
      // palavra maior que a linha: quebra à força
      if (!cur.length && w.width > opts.width) {
        let rest = w.text;
        while (rest) {
          let n = rest.length;
          while (n > 1 && font(w.bold).widthOfTextAtSize(rest.slice(0, n), opts.size) > opts.width) n--;
          const piece = rest.slice(0, n);
          lines.push([{ ...w, text: piece, width: font(w.bold).widthOfTextAtSize(piece, opts.size) }]);
          rest = rest.slice(n);
        }
        continue;
      }
      curW += sep(cur[cur.length - 1]) + w.width;
      cur.push(w);
    }
    if (cur.length) lines.push(cur);

    lines.forEach((line, i) => {
      need(opts.leading);
      const textW = line.reduce((a, w) => a + w.width, 0);
      const gaps = line.slice(0, -1).filter((w) => w.space).length;
      const naturalW = textW + gaps * spaceW;
      const last = i === lines.length - 1;
      let gap = spaceW;
      let x = opts.x;
      if (opts.align === "justify" && !last && gaps > 0) gap = (opts.width - textW) / gaps;
      if (opts.align === "center") x = opts.x + (opts.width - naturalW) / 2;
      y -= opts.leading;
      for (const w of line) {
        page.drawText(w.text, { x, y: y + (opts.leading - opts.size) / 2, size: opts.size, font: font(w.bold), color: INK });
        x += w.width + (w.space ? gap : 0);
      }
    });
  }

  function signatureBlock() {
    const colW = (WIDTH - 40) / 2;
    const cols = [
      { label: "CONTRATADA", ...sig.contratada },
      { label: "CONTRATANTE", ...sig.contratante },
    ];
    need(110);
    y -= 50;
    cols.forEach((c, i) => {
      const x = M.left + i * (colW + 40);
      page.drawLine({ start: { x, y }, end: { x: x + colW, y }, thickness: 0.6, color: INK });
      let yy = y - 13;
      for (const [t, b, color] of [[c.nome || "", true, INK], [c.documento || "", false, INK], [c.label, false, MUTED]] as const) {
        if (!t) continue;
        const s = clean(t);
        const f = b ? bold : regular;
        const size = t === c.label ? 9 : 10;
        let shown = s;
        while (shown.length > 3 && f.widthOfTextAtSize(shown, size) > colW) shown = shown.slice(0, -1);
        page.drawText(shown, { x: x + (colW - f.widthOfTextAtSize(shown, size)) / 2, y: yy, size, font: f, color });
        yy -= 13;
      }
    });
    y -= 50;
    if (sig.testemunhas) {
      need(100);
      y -= 10;
      page.drawText("Testemunhas:", { x: M.left, y, size: 10, font: bold, color: INK });
      y -= 45;
      for (let i = 0; i < 2; i++) {
        const x = M.left + i * (colW + 40);
        page.drawLine({ start: { x, y }, end: { x: x + colW, y }, thickness: 0.6, color: INK });
        page.drawText("Nome:", { x, y: y - 13, size: 9, font: regular, color: MUTED });
        page.drawText("CPF:", { x, y: y - 26, size: 9, font: regular, color: MUTED });
      }
      y -= 40;
    }
  }

  const blocks = parseBlocks(texto);
  for (const [i, b] of blocks.entries()) {
    switch (b.kind) {
      case "title":
        if (i > 0) need(60);
        drawWords(words([{ text: b.text, bold: true }], 14), { size: 14, x: M.left, width: WIDTH, align: "center", leading: 19 });
        y -= 14;
        break;
      case "heading":
        need(LEADING * 3);
        y -= 8;
        drawWords(words([{ text: b.text, bold: true }], SIZE), { size: SIZE, x: M.left, width: WIDTH, align: "left", leading: LEADING });
        y -= 3;
        break;
      case "subheading":
        need(LEADING * 2);
        y -= 3;
        drawWords(words([{ text: b.text, bold: true }], SIZE), { size: SIZE, x: M.left, width: WIDTH, align: "left", leading: LEADING });
        break;
      case "paragraph":
        drawWords(words(b.spans, SIZE), { size: SIZE, x: M.left, width: WIDTH, align: "justify", leading: LEADING });
        y -= 7;
        break;
      case "bullet": {
        need(LEADING);
        page.drawText(clean(b.label ?? "•"), { x: M.left + 8, y: y - LEADING + (LEADING - SIZE) / 2, size: SIZE, font: regular, color: INK });
        drawWords(words(b.spans, SIZE), { size: SIZE, x: M.left + 22, width: WIDTH - 22, align: "justify", leading: LEADING });
        y -= 3;
        break;
      }
      case "center":
        y -= 6;
        drawWords(words(b.spans, SIZE), { size: SIZE, x: M.left, width: WIDTH, align: "center", leading: LEADING });
        y -= 6;
        break;
      case "pagebreak":
        newPage();
        break;
      case "signatures":
        signatureBlock();
        break;
    }
  }

  // Rodapé: código do contrato e numeração de páginas.
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const t = clean(`${meta.code} · Página ${i + 1} de ${pages.length}`);
    const w = regular.widthOfTextAtSize(t, 8);
    p.drawText(t, { x: (A4.w - w) / 2, y: 36, size: 8, font: regular, color: MUTED });
  });

  return pdf.save({ useObjectStreams: true });
}
