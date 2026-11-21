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

describe("ferramentas de estratégia e execução", async () => {
  const f = await import("@/lib/ferramentas");
  const { readTool, ruleToolReport } = await import("@/lib/relatorios/regras");

  it("todas as 12 ferramentas têm ajuda, normalizam vazio e exportam", () => {
    expect(f.TOOL_KINDS).toHaveLength(12);
    expect(f.TOOL_GROUPS.flatMap((g) => g.kinds).sort()).toEqual([...f.TOOL_KINDS].sort());
    for (const k of f.TOOL_KINDS) {
      expect(f.TOOLS[k].steps.length).toBeGreaterThan(2);
      if (k !== "cinco_porques") expect(f.toolTable(k, {}).rows).toEqual([]);
      expect(f.actionCandidates(k, null)).toEqual([]);
      expect(readTool({ id: "x", kind: k, title: "t", data: {}, notes: null }).vazia).toBe(true);
    }
  });

  it("quadros: limpa seções desconhecidas, limita notas e só gera ação das seções certas", () => {
    const d = f.normalize("porter", {
      foco: " Setor ",
      secoes: { rivalidade: [{ id: "a", text: "Guerra de preço" }], inventada: [{ id: "b", text: "x" }], clientes: [{ text: "" }] },
      notas: { rivalidade: 9, entrantes: -2, clientes: "3" },
    });
    expect(d.foco).toBe("Setor");
    expect(Object.keys(d.secoes)).toEqual(["rivalidade", "entrantes", "substitutos", "clientes", "fornecedores"]);
    expect(d.notas).toMatchObject({ rivalidade: 5, entrantes: 0, clientes: 3 });
    expect(f.toolTable("porter", d).rows).toEqual([["Rivalidade entre concorrentes", "Guerra de preço", "5 · Muito alto"]]);

    const e = { secoes: { fazer: [{ id: "1", text: "Pagar folha" }], eliminar: [{ id: "2", text: "Relatório inútil" }] } };
    expect(f.actionCandidates("eisenhower", e).map((c) => c.text)).toEqual(["Pagar folha"]);
    expect(f.actionCandidates("canvas", { secoes: { proposta: [{ id: "1", text: "x" }] } })).toEqual([]);
  });

  it("OKR calcula progresso, inclusive meta para baixo, e só propõe ação para o que falta", () => {
    expect(f.krProgress({ inicial: 0, meta: 100, atual: 25 })).toBe(25);
    expect(f.krProgress({ inicial: 20, meta: 10, atual: 15 })).toBe(50);
    expect(f.krProgress({ inicial: 0, meta: 10, atual: 30 })).toBe(100);
    expect(f.krProgress({ inicial: 5, meta: 5, atual: 5 })).toBe(100);
    const d = { objetivos: [{ id: "o", text: "Crescer", krs: [{ id: "a", text: "Clientes", inicial: 0, meta: 10, atual: 10 }, { id: "b", text: "Margem", inicial: "10", meta: "20", atual: "12,5" }] }] };
    expect(f.okrProgress(f.normalize("okr", d).objetivos[0])).toBe(63);
    expect(f.actionCandidates("okr", d).map((c) => c.text)).toEqual(["Margem"]);
    expect(readTool({ id: "x", kind: "okr", title: "t", data: d, notes: null }).implicacoes[0]).toContain("1 resultado-chave está abaixo de 40%");
  });

  it("BSC aponta perspectiva vazia e objetivo sem indicador", () => {
    const d = { perspectivas: { financeira: [{ id: "1", text: "Aumentar margem", indicador: "Margem bruta", meta: "30%" }], clientes: [{ id: "2", text: "Fidelizar" }] } };
    expect(f.actionCandidates("bsc", d)[0].text).toBe("Aumentar margem (meta: 30%)");
    const r = readTool({ id: "x", kind: "bsc", title: "t", data: d, notes: null });
    expect(r.implicacoes[0]).toContain("Processos internos, Aprendizado e crescimento");
    expect(r.recomendacoes).toContain('Completar indicador e meta de "Fidelizar".');
  });

  it("análises de quadros: Porter, PESTEL, Eisenhower e PDCA", () => {
    const porter = readTool({ id: "x", kind: "porter", title: "t", data: { secoes: { clientes: [{ id: "1", text: "Três clientes = 70% da receita" }] }, notas: { clientes: 5, rivalidade: 4 } }, notes: null });
    expect(porter.implicacoes[0]).toContain("pressão competitiva média é alta");
    expect(porter.recomendacoes[0]).toContain("dependência dos maiores clientes");

    const pdca = readTool({ id: "x", kind: "pdca", title: "t", data: { foco: "Atrasos", secoes: { planejar: [{ id: "1", text: "Meta" }], executar: [{ id: "2", text: "Feito" }] } }, notes: null });
    expect(pdca.implicacoes.join(" ")).toContain("ainda não foi medido");
    expect(pdca.recomendacoes[0]).toBe("Avançar para a etapa Checar (C).");

    const eis = ruleToolReport({ id: "x", kind: "eisenhower", title: "Agenda", data: { secoes: { fazer: [{ id: "1", text: "A" }, { id: "2", text: "B" }], agendar: [{ id: "3", text: "C" }] } }, notes: null }, []);
    expect(eis.secoes.find((s) => s.titulo === "Implicações para o negócio")!.texto).toContain("apagando incêndios");

    const pestel = readTool({ id: "x", kind: "pestel", title: "t", data: { secoes: { economico: [{ id: "1", text: "Juros" }] }, notas: { economico: 5 } }, notes: null });
    expect(pestel.recomendacoes[0]).toContain("Econômico");
  });
});
