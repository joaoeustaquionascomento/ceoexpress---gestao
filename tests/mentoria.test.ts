import { describe, expect, it } from "vitest";
import { INSTRUMENTS, INSTRUMENT_LIST, itemCount } from "@/lib/mentoria/instrumentos";
import { DESIRED_PREFIX, bandOf, buildReport, computeScores, expectedKeys, indexScore, sanitizeAnswers } from "@/lib/mentoria/pontuacao";
import { INSTRUMENT_IDS } from "@/lib/mentoria/tipos";

describe("mentoria: conteúdo das avaliações", () => {
  it("tem as 6 avaliações, com ids únicos e textos preenchidos", () => {
    expect(INSTRUMENT_LIST.map((i) => i.id)).toEqual([...INSTRUMENT_IDS]);
    const ids = new Set<string>();
    for (const instr of INSTRUMENT_LIST) {
      for (const k of expectedKeys(instr)) {
        expect(ids.has(k) && !k.startsWith(DESIRED_PREFIX)).toBe(false);
        ids.add(k);
      }
      for (const d of instr.dimensions) {
        expect(d.items.length).toBeGreaterThanOrEqual(2);
        for (const t of [d.label, d.description, d.high, d.low, d.action, ...d.questions]) expect(t.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it("número de perguntas por avaliação", () => {
    expect(itemCount(INSTRUMENTS.roda_vida)).toBe(24);
    expect(itemCount(INSTRUMENTS.ie_lideranca)).toBe(20);
    expect(itemCount(INSTRUMENTS.barreiras_mudanca)).toBe(24);
    expect(itemCount(INSTRUMENTS.armadilhas_decisao)).toBe(21);
    expect(itemCount(INSTRUMENTS.perfil_empreendedor)).toBe(30);
    expect(itemCount(INSTRUMENTS.mente_a_favor)).toBe(28);
    expect(INSTRUMENTS.roda_vida.dimensions).toHaveLength(12);
  });

  it("textos genéricos: sem nomes de clientes nem marcas de terceiros", () => {
    const all = JSON.stringify(INSTRUMENT_LIST).toLowerCase();
    for (const proibido of ["fiq", "secullus", "cookies", "ap12", "leaderskill", "sabotador(es)?", "chamine", "neurovox"]) {
      expect(new RegExp(`\\b${proibido}\\b`).test(all)).toBe(false);
    }
  });
});

describe("mentoria: pontuação", () => {
  const ie = INSTRUMENTS.ie_lideranca;

  it("converte 1 a 5 para 0 a 10 e inverte itens ao contrário", () => {
    const all5 = Object.fromEntries(expectedKeys(ie).map((k) => [k, 5]));
    const s = computeScores(ie, all5);
    // Cada dimensão tem 1 item invertido: 3 itens valem 10 e 1 vale 0.
    for (const d of s.dims) expect(d.score).toBe(7.5);
    const ideal = Object.fromEntries(ie.dimensions.flatMap((d) => d.items.map((i) => [i.id, i.reverse ? 1 : 5])));
    expect(computeScores(ie, ideal).overall).toBe(10);
    const pior = Object.fromEntries(ie.dimensions.flatMap((d) => d.items.map((i) => [i.id, i.reverse ? 5 : 1])));
    expect(computeScores(ie, pior).overall).toBe(0);
  });

  it("Roda da Vida usa a nota direta e guarda o desejado", () => {
    const rv = INSTRUMENTS.roda_vida;
    const a: Record<string, number> = {};
    for (const d of rv.dimensions) {
      a[d.items[0].id] = 4;
      a[d.items[1].id] = 6;
      a[DESIRED_PREFIX + d.id] = 9;
    }
    const s = computeScores(rv, a);
    expect(s.dims[0]).toMatchObject({ score: 5, desired: 9 });
    const r = buildReport(rv, s);
    expect(r.dims[0].gap).toBe(4);
    expect(r.attention.length).toBe(3);
  });

  it("índice Mente a Favor vai de 0 a 100", () => {
    const mf = INSTRUMENTS.mente_a_favor;
    const bom = Object.fromEntries(mf.index!.items.map((i) => [i.id, i.positive ? 5 : 1]));
    const ruim = Object.fromEntries(mf.index!.items.map((i) => [i.id, i.positive ? 1 : 5]));
    const meio = Object.fromEntries(mf.index!.items.map((i) => [i.id, 3]));
    expect(indexScore(mf, bom)).toBe(100);
    expect(indexScore(mf, ruim)).toBe(0);
    expect(indexScore(mf, meio)).toBe(50);
    expect(indexScore(mf, Object.fromEntries(mf.index!.items.map((i) => [i.id, 1])))).toBe(50);
  });

  it("limpa respostas: só chaves conhecidas e dentro da escala", () => {
    const { answers, missing } = sanitizeAnswers(ie, { ie01: 3, ie02: 9, ie03: "2", ie04: 2.5, hack: 5 });
    expect(answers).toEqual({ ie01: 3, ie03: 2 });
    expect(missing).toContain("ie02");
    expect(missing).toHaveLength(18);
    const rv = sanitizeAnswers(INSTRUMENTS.roda_vida, { rv01: 0, rv02: 10, [DESIRED_PREFIX + "saude"]: 10 });
    expect(rv.answers).toEqual({ rv01: 0, rv02: 10, [DESIRED_PREFIX + "saude"]: 10 });
  });

  it("faixas: verde é sempre bom, mesmo na escala de risco", () => {
    expect(bandOf(8.5, "competencia")).toMatchObject({ label: "Forte", tone: "ok", needsWork: false });
    expect(bandOf(3.9, "competencia")).toMatchObject({ label: "Crítico", tone: "bad", needsWork: true });
    expect(bandOf(8.5, "risco")).toMatchObject({ label: "Crítico", tone: "bad", needsWork: true });
    expect(bandOf(2, "risco")).toMatchObject({ label: "Baixo", tone: "ok", needsWork: false });
    expect(bandOf(6, "risco").needsWork).toBe(true);
    expect(bandOf(5.9, "risco").needsWork).toBe(false);
  });
});

describe("mentoria: relatório", () => {
  const bm = INSTRUMENTS.barreiras_mudanca;
  const answersWith = (high: string[]) =>
    Object.fromEntries(
      bm.dimensions.flatMap((d) =>
        d.items.map((i) => {
          const pesa = high.includes(d.id);
          // Para pesar muito: frases de barreira em "Sempre", frase invertida em "Nunca".
          return [i.id, pesa ? (i.reverse ? 1 : 5) : i.reverse ? 5 : 1];
        }),
      ),
    );

  it("na escala de risco, o que pesa vai para atenção com perguntas e ações", () => {
    const s = computeScores(bm, answersWith(["habitos", "isolamento"]));
    const r = buildReport(bm, s);
    expect(r.attention.map((d) => d.id).sort()).toEqual(["habitos", "isolamento"]);
    expect(r.questions).toHaveLength(4);
    expect(r.actions).toHaveLength(2);
    expect(r.dims.at(-1)!.score).toBe(10);
    expect(r.headline).toMatch(/O que mais pesa hoje/);
  });

  it("compara com a aplicação anterior", () => {
    const antes = computeScores(bm, answersWith(["habitos", "isolamento"]));
    const depois = computeScores(bm, answersWith(["habitos"]));
    const r = buildReport(bm, depois, antes);
    const iso = r.dims.find((d) => d.id === "isolamento")!;
    expect(iso.previous).toBe(10);
    expect(iso.delta).toBe(-10);
    expect(r.overall.delta).toBeLessThan(0);
  });
});
