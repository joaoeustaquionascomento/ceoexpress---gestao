import { describe, expect, it } from "vitest";
import { actionCandidates, gutRanking, normalize, paretoRows, toolTable } from "@/lib/ferramentas";

describe("Ferramentas: normalização", () => {
  it("descarta lixo e limita notas GUT entre 1 e 5", () => {
    const d = normalize("gut", { items: [{ id: "a", text: " Atraso ", g: 9, u: 0, t: "3" }, { text: "" }, "x"] });
    expect(d.items).toEqual([{ id: "a", text: "Atraso", g: 5, u: 1, t: 3 }]);
    expect(normalize("swot", null)).toEqual({ forcas: [], fraquezas: [], oportunidades: [], ameacas: [] });
    expect(normalize("pareto", { items: [{ categoria: "A", valor: "12,5" }] }).items[0].valor).toBe(12.5);
    expect(normalize("cinco_porques", { porques: ["1", "2", "3", "4", "5", "6", "7", "8"] }).porques).toHaveLength(7);
  });
});

describe("GUT", () => {
  it("ordena pela pontuação G×U×T", () => {
    const r = gutRanking([
      { id: "a", text: "A", g: 2, u: 2, t: 2 },
      { id: "b", text: "B", g: 5, u: 5, t: 4 },
    ]);
    expect(r.map((x) => [x.text, x.score])).toEqual([["B", 100], ["A", 8]]);
  });
});

describe("Pareto", () => {
  it("ordena, acumula e marca as poucas vitais até cruzar 80%", () => {
    const { total, rows } = paretoRows([
      { id: "1", categoria: "Entrega", valor: 50 },
      { id: "2", categoria: "Preço", valor: 10 },
      { id: "3", categoria: "Atendimento", valor: 30 },
      { id: "4", categoria: "Outros", valor: 10 },
      { id: "5", categoria: "Zero", valor: 0 },
    ]);
    expect(total).toBe(100);
    expect(rows.map((r) => r.categoria)).toEqual(["Entrega", "Atendimento", "Outros", "Preço"]);
    expect(rows.map((r) => r.cum)).toEqual([50, 80, 90, 100]);
    expect(rows.map((r) => r.vital)).toEqual([true, true, false, false]);
  });
  it("uma categoria dominante sozinha é a única vital", () => {
    const { rows } = paretoRows([{ id: "1", categoria: "A", valor: 95 }, { id: "2", categoria: "B", valor: 5 }]);
    expect(rows.map((r) => r.vital)).toEqual([true, false]);
  });
});

describe("Itens para ações e exportação", () => {
  it("gera candidatos por ferramenta", () => {
    expect(actionCandidates("swot", { fraquezas: [{ id: "x", text: "Sem fluxo de caixa" }] })).toEqual([
      { key: "fraquezas:x", group: "Fraquezas", text: "Sem fluxo de caixa" },
    ]);
    expect(actionCandidates("cinco_porques", { causa_raiz: "Sem checklist", contramedida: "Criar checklist" })[0].text).toBe("Criar checklist");
    expect(actionCandidates("cinco_porques", {})).toEqual([]);
    expect(actionCandidates("pareto", { items: [{ id: "1", categoria: "A", valor: 9 }, { id: "2", categoria: "B", valor: 1 }] }).map((c) => c.text)).toEqual(["A"]);
  });
  it("monta tabelas para CSV", () => {
    const t = toolTable("cinco_porques", { problema: "P", porques: ["a", "", "b"], causa_raiz: "C", contramedida: "M" });
    expect(t.rows).toEqual([["Problema", "P"], ["Por quê 1", "a"], ["Por quê 2", "b"], ["Causa raiz", "C"], ["Contramedida", "M"]]);
    expect(toolTable("gut", { items: [{ id: "a", text: "X", g: 1, u: 2, t: 3 }] }).rows[0]).toEqual([1, "X", 1, 2, 3, 6]);
  });
});
