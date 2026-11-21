import { describe, expect, it } from "vitest";
import { changedFields, recordLabel } from "@/lib/audit-format";
import { csvCell, slugify, toCsv } from "@/lib/csv";
import { buildDigest } from "@/lib/email";

describe("CSV", () => {
  it("usa ponto e vírgula, BOM e CRLF", () => {
    const out = toCsv(["Código", "Ação"], [["A1", "Revisar preço"]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toBe("﻿Código;Ação\r\nA1;Revisar preço\r\n");
  });
  it("protege aspas, separador e quebras de linha", () => {
    expect(csvCell('diz "oi"; tchau')).toBe('"diz ""oi""; tchau"');
    expect(csvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });
  it("neutraliza fórmulas de planilha", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-10")).toBe("'-10");
    expect(csvCell(-10)).toBe("-10");
  });
  it("gera nome de arquivo sem acentos", () => {
    expect(slugify("Planejamento Estratégico FIQ 2026")).toBe("planejamento-estrategico-fiq-2026");
    expect(slugify("***")).toBe("projeto");
  });
});

describe("Auditoria", () => {
  it("lista só os campos que mudaram, sem ruído técnico", () => {
    const before = { id: "1", title: "A", status: "a_fazer", updated_at: "x", due_on: null };
    const after = { id: "1", title: "A", status: "concluida", updated_at: "y", due_on: "2026-12-01" };
    expect(changedFields(before, after)).toEqual(["due_on", "status"]);
    expect(changedFields(null, after)).toEqual([]);
  });
  it("monta um rótulo legível", () => {
    expect(recordLabel(null, { code: "D01", title: "Contrato social" })).toBe("D01 · Contrato social");
    expect(recordLabel({ trade_name: "FIQ Brasil" }, null)).toBe("FIQ Brasil");
    expect(recordLabel(null, { id: "x" })).toBe("");
  });
});

describe("Resumo diário por e-mail", () => {
  const items = [
    { title: "Pedido D01 aprovado", link: "/avisos/abc", created_at: "2026-11-21T10:00:00Z" },
    { title: "Nova ação <A3> atribuída", link: "/avisos/def", created_at: "2026-11-21T11:00:00Z" },
  ];
  it("monta assunto, links absolutos e escapa HTML", () => {
    const m = buildDigest("Maria Souza", items, "https://app.exemplo.com/");
    expect(m.subject).toBe("CEOEXPRESS: você tem 2 avisos novos");
    expect(m.text).toContain("https://app.exemplo.com/avisos/abc");
    expect(m.html).toContain("Maria, você tem 2 avisos novos");
    expect(m.html).toContain("Nova ação &lt;A3&gt; atribuída");
    expect(m.html).not.toContain("<A3>");
  });
  it("resume quando há muitos avisos", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ title: `Aviso ${i}`, link: null, created_at: "" }));
    const m = buildDigest("", many, "https://app.exemplo.com", 20);
    expect(m.text).toContain("e mais 5 aviso(s)");
    expect(m.subject).toContain("25 avisos");
  });
});

import { formatChecklist, parseChecklist, parseFormats } from "@/lib/checklist";

describe("Subitens e formatos do pedido", () => {
  it("lê um subitem por linha, com orientação depois de ::", () => {
    const items = parseChecklist("Extratos :: últimos 3 meses\n\n  Contrato social  \nA :: b :: c");
    expect(items).toEqual([
      { item: "Extratos", instrucao: "últimos 3 meses" },
      { item: "Contrato social", instrucao: null },
      { item: "A", instrucao: "b :: c" },
    ]);
    expect(parseChecklist(formatChecklist(items))).toEqual(items);
    expect(formatChecklist(null)).toBe("");
  });
  it("normaliza formatos aceitos", () => {
    expect(parseFormats(".PDF, xlsx; docx docx")).toEqual(["pdf", "xlsx", "docx"]);
    expect(parseFormats("")).toEqual(["pdf"]);
  });
});
