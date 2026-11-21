/**
 * CSV no formato que o Excel em português abre direto: separador ";",
 * BOM UTF-8 (acentos corretos) e quebra de linha CRLF.
 */

export type Cell = string | number | boolean | null | undefined;

/** Fórmulas começam com estes caracteres; um apóstrofo evita que o Excel as execute. */
const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (typeof v === "string" && FORMULA.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Nome de arquivo seguro: sem acentos, espaços viram hífen. */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "projeto";
}
