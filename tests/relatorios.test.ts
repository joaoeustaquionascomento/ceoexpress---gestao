import { describe, expect, it } from "vitest";
import { nextCode } from "@/lib/codigos";
import { buildProjectDossier, buildToolDossier, clip, normalizeContent, textBlocks } from "@/lib/relatorios/conteudo";

describe("códigos PI e AP", () => {
  it("continua a numeração, aceitando os códigos antigos", () => {
    expect(nextCode("PI", [])).toBe("PI-01");
    expect(nextCode("PI", ["PI-03", "D07", null, "X1"])).toBe("PI-08");
    expect(nextCode("AP", ["AP-09", "A02", "ap10"])).toBe("AP-11");
    expect(nextCode("AP", ["AP-99"])).toBe("AP-100");
  });
});

describe("conteúdo do relatório", () => {
  it("normaliza o que vier, descartando seções vazias", () => {
    expect(normalizeContent(null)).toEqual({ resumo: "", secoes: [], lacunas: [] });
    const c = normalizeContent({ resumo: "R", secoes: [{ titulo: "A", texto: "t" }, { titulo: "", texto: " " }, 3], lacunas: ["x", "", 5] });
    expect(c.secoes).toEqual([{ titulo: "A", texto: "t" }]);
    expect(c.lacunas).toEqual(["x"]);
  });

  it("transforma texto em parágrafos e listas", () => {
    expect(textBlocks("Linha um\ncontinua\n\n- a\n- b\nFim")).toEqual([
      { type: "p", text: "Linha um continua" },
      { type: "ul", items: ["a", "b"] },
      { type: "p", text: "Fim" },
    ]);
  });

  it("corta textos longos", () => {
    expect(clip("a  b\n c")).toBe("a b c");
    expect(clip("x".repeat(10), 5)).toBe("xxxx…");
  });
});

describe("dossiê enviado à IA", () => {
  const project = { kind: "Reestruturação", description: "Desc", status: "ativo", starts_on: "2026-01-01", ends_on: null };
  const today = "2026-11-21";

  it("resume o projeto com números, atrasos e sem nomes de responsáveis", () => {
    const d = buildProjectDossier({
      project,
      today,
      requests: [
        { code: "PI-01", title: "Extratos", category: "Financeiro", status: "aprovado", due_on: "2026-11-01" },
        { code: "PI-02", title: "DRE", category: "Financeiro", status: "nao_iniciado", due_on: "2026-11-10" },
      ],
      actions: [
        { code: "AP-01", title: "Fluxo de caixa", rationale: null, area: null, priority: "alta", status: "em_andamento", due_on: "2026-11-01", has_owner: true },
        { code: "AP-02", title: "Treinar", rationale: null, area: null, priority: "media", status: "a_fazer", due_on: null, has_owner: false },
      ],
      decisions: [],
      tools: [{ id: "t", kind: "swot", title: "SWOT", data: { forcas: [{ id: "1", text: "Marca forte" }] }, notes: "Ok" }],
    });
    expect(d).toContain("2 aplicáveis; 1 recebidos; 1 aprovados; 1 vencidos sem envio");
    expect(d).toContain("1 atrasadas");
    expect(d).toContain("1 abertas sem responsável");
    expect(d).toContain("AP-01 | Fluxo de caixa | prioridade alta | em andamento | prazo 01/11/2026 (ATRASADA) | responsável definido");
    expect(d).toContain("Forças | Marca forte");
    expect(d).toContain("Conclusões registradas pela consultoria: Ok");
  });

  it("análise de ferramenta inclui as ações já geradas", () => {
    const d = buildToolDossier({
      project,
      today,
      tool: { id: "t", kind: "gut", title: "Problemas", data: { items: [{ id: "a", text: "Atraso", g: 5, u: 5, t: 4 }] }, notes: null },
      linkedActions: [{ code: "AP-03", title: "Cobrar", rationale: null, area: null, priority: "alta", status: "a_fazer", due_on: null, has_owner: false }],
    });
    expect(d).toContain("1 | Atraso | 5 | 5 | 4 | 100");
    expect(d).toContain("AP-03 | Cobrar");
  });
});

describe("relatório automático por regras", async () => {
  const { ruleProjectReport, ruleToolReport, readTool } = await import("@/lib/relatorios/regras");
  const today = "2026-11-21";
  const project = { kind: null, description: null, status: "ativo", starts_on: null, ends_on: null };
  const act = (over: Partial<import("@/lib/relatorios/conteudo").DossierAction>) => ({
    code: "AP-01", title: "Ação", rationale: null, area: null, priority: "media", status: "a_fazer", due_on: null, has_owner: true, source_tool_id: null, ...over,
  });

  it("monta as seis seções com números, atrasos, riscos e próximos passos", () => {
    const swot = { id: "s", kind: "swot", title: "SWOT", data: { fraquezas: [{ id: "1", text: "Caixa curto" }], ameacas: [{ id: "2", text: "Juros altos" }] }, notes: null };
    const r = ruleProjectReport({
      project, today, decisions: [],
      requests: [
        { code: "PI-01", title: "Extratos", category: "Fin", status: "aprovado", due_on: null },
        { code: "PI-02", title: "DRE", category: "Fin", status: "nao_iniciado", due_on: "2026-11-10" },
      ],
      actions: [
        act({ code: "AP-01", title: "Fluxo", priority: "critica", status: "em_andamento", due_on: "2026-11-01" }),
        act({ code: "AP-02", title: "Treinar", has_owner: false, due_on: "2026-12-05" }),
        act({ code: "AP-03", title: "Feita", status: "concluida" }),
      ],
      tools: [swot],
    });
    expect(r.secoes.map((s) => s.titulo)).toEqual([
      "Visão geral", "Diagnóstico", "Prioridades", "Andamento do plano de ação", "Riscos e pontos de atenção", "Próximos passos (30 dias)",
    ]);
    expect(r.resumo).toContain("33% concluídas");
    expect(r.resumo).toContain("50% das informações");
    const txt = (t: string) => r.secoes.find((s) => s.titulo === t)!.texto;
    expect(txt("Prioridades").split("\n")[1]).toContain("AP-01 · Fluxo: prioridade crítica");
    expect(txt("Prioridades")).toContain('Tratar a fraqueza "Caixa curto"');
    expect(txt("Andamento do plano de ação")).toContain("Sem responsável definido:\n- AP-02 · Treinar");
    expect(txt("Riscos e pontos de atenção")).toContain("PI-02 · DRE (venceu em 10/11/2026)");
    expect(txt("Riscos e pontos de atenção")).toContain("Ameaça apontada na SWOT: Juros altos");
    expect(txt("Próximos passos (30 dias)")).toContain("Concluir AP-02 · Treinar até 05/12/2026");
    expect(r.lacunas).toContain('Ferramenta "SWOT" sem conclusões da consultoria.');
  });

  it("projeto vazio ainda gera um texto útil", () => {
    const r = ruleProjectReport({ project, today, requests: [], actions: [], decisions: [], tools: [] });
    expect(r.secoes.every((s) => s.texto.length > 0)).toBe(true);
    expect(r.lacunas).toContain("Nenhuma ferramenta de diagnóstico preenchida.");
  });

  it("lê cada ferramenta e marca o que já está no plano", () => {
    const gut = { id: "g", kind: "gut", title: "GUT", data: { items: [{ id: "a", text: "Atraso", g: 5, u: 5, t: 4 }, { id: "b", text: "Retrabalho", g: 2, u: 2, t: 2 }] }, notes: null };
    const r = readTool(gut, [act({ title: "Atraso" })]);
    expect(r.achados[0]).toBe("1º Atraso: nota 100 (G5 U5 T4) (já está no plano)");
    expect(r.implicacoes[0]).toContain("1 problema tem nota 64 ou mais");

    const pareto = { id: "p", kind: "pareto", title: "P", data: { unidade: "R$", items: [{ id: "1", categoria: "A", valor: 80 }, { id: "2", categoria: "B", valor: 15 }, { id: "3", categoria: "C", valor: 5 }] }, notes: null };
    expect(readTool(pareto).leitura).toContain("1 categoria concentra 80% do total");

    const vazio = ruleToolReport({ id: "x", kind: "ishikawa", title: "I", data: {}, notes: null }, []);
    expect(vazio.lacunas).toEqual(["A ferramenta está vazia."]);
    for (const kind of ["swot", "cinco_porques", "ishikawa"]) expect(readTool({ id: "x", kind, title: "t", data: {}, notes: null }).vazia).toBe(true);
  });
});
