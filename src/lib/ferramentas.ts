/**
 * Ferramentas de gestão: definição de cada uma, normalização do conteúdo
 * (o JSON salvo no banco), cálculos (GUT, Pareto), linhas para CSV e itens
 * que podem virar ação no plano. Funções puras, sem acesso ao banco.
 *
 * Os textos de ajuda foram escritos para o app; não reproduzem obras de terceiros.
 */

export type ToolKind = "swot" | "gut" | "cinco_porques" | "ishikawa" | "pareto";
export const TOOL_KINDS: ToolKind[] = ["swot", "gut", "cinco_porques", "ishikawa", "pareto"];

export type TextItem = { id: string; text: string };

export type SwotData = { forcas: TextItem[]; fraquezas: TextItem[]; oportunidades: TextItem[]; ameacas: TextItem[] };
export type GutItem = { id: string; text: string; g: number; u: number; t: number };
export type GutData = { items: GutItem[] };
export type WhyData = { problema: string; porques: string[]; causa_raiz: string; contramedida: string };
export type IshikawaData = { efeito: string; causas: Record<IshikawaCat, TextItem[]> };
export type ParetoItem = { id: string; categoria: string; valor: number };
export type ParetoData = { unidade: string; items: ParetoItem[] };

export type ToolData = {
  swot: SwotData;
  gut: GutData;
  cinco_porques: WhyData;
  ishikawa: IshikawaData;
  pareto: ParetoData;
};

export const SWOT_QUADRANTS: { key: keyof SwotData; label: string; hint: string; tone: "ok" | "bad" | "info" | "warn" }[] = [
  { key: "forcas", label: "Forças", hint: "O que a empresa faz bem e depende dela", tone: "ok" },
  { key: "fraquezas", label: "Fraquezas", hint: "O que atrapalha hoje e depende dela", tone: "bad" },
  { key: "oportunidades", label: "Oportunidades", hint: "O que acontece fora e pode ser aproveitado", tone: "info" },
  { key: "ameacas", label: "Ameaças", hint: "O que acontece fora e pode prejudicar", tone: "warn" },
];

export type IshikawaCat = "metodo" | "mao_de_obra" | "maquina" | "material" | "medicao" | "meio_ambiente";
export const ISHIKAWA_CATS: { key: IshikawaCat; label: string; hint: string }[] = [
  { key: "metodo", label: "Método", hint: "Processos, rotinas, regras" },
  { key: "mao_de_obra", label: "Pessoas", hint: "Equipe, treinamento, carga de trabalho" },
  { key: "maquina", label: "Máquinas e sistemas", hint: "Equipamentos, softwares, ferramentas" },
  { key: "material", label: "Materiais", hint: "Insumos, fornecedores, informações recebidas" },
  { key: "medicao", label: "Medição", hint: "Indicadores, controles, dados" },
  { key: "meio_ambiente", label: "Ambiente", hint: "Mercado, clima, local, regras externas" },
];

export const GUT_SCALE: Record<"g" | "u" | "t", { label: string; levels: string[] }> = {
  g: { label: "Gravidade", levels: ["Sem gravidade", "Pouco grave", "Grave", "Muito grave", "Extremamente grave"] },
  u: { label: "Urgência", levels: ["Pode esperar", "Pouco urgente", "O mais cedo possível", "Com alguma urgência", "Ação imediata"] },
  t: { label: "Tendência", levels: ["Não vai piorar", "Piora a longo prazo", "Piora a médio prazo", "Piora a curto prazo", "Piora rapidamente"] },
};

export const TOOLS: Record<ToolKind, { label: string; summary: string; when: string; steps: string[] }> = {
  swot: {
    label: "Análise SWOT (FOFA)",
    summary: "Retrato da situação: forças e fraquezas internas, oportunidades e ameaças externas.",
    when: "No início do projeto ou antes de definir metas, para alinhar a visão da equipe.",
    steps: [
      "Liste fatos, não opiniões soltas. Prefira itens curtos e específicos.",
      "Interno é o que a empresa controla; externo é o que ela só pode acompanhar.",
      "Depois de preencher, cruze os quadrantes: como usar uma força para aproveitar uma oportunidade? Que fraqueza deixa a empresa exposta a uma ameaça?",
      "Transforme os cruzamentos mais importantes em ações no plano.",
    ],
  },
  gut: {
    label: "Matriz GUT",
    summary: "Prioriza problemas pela nota de Gravidade × Urgência × Tendência (de 1 a 125).",
    when: "Quando há muitos problemas e é preciso decidir por onde começar.",
    steps: [
      "Liste os problemas, um por linha.",
      "Dê nota de 1 a 5 para cada critério. Use a mesma régua para todos os itens.",
      "A lista se ordena sozinha pela pontuação. Ataque primeiro os do topo.",
      "Reavalie as notas depois de algumas semanas: a prioridade muda.",
    ],
  },
  cinco_porques: {
    label: "5 Porquês",
    summary: "Chega à causa raiz de um problema perguntando “por quê?” em sequência.",
    when: "Para um problema específico e recorrente, depois de apagar o incêndio.",
    steps: [
      "Descreva o problema como um fato observado (o quê, onde, quando, quanto).",
      "Pergunte por que ele acontece. A resposta vira a base da próxima pergunta.",
      "Pare quando chegar a algo que a empresa pode mudar e que, mudado, evita a repetição. Às vezes são 3 porquês, às vezes 7.",
      "Registre a causa raiz e a contramedida, e gere a ação no plano.",
    ],
  },
  ishikawa: {
    label: "Diagrama de Ishikawa (espinha de peixe)",
    summary: "Organiza as possíveis causas de um efeito em seis grupos.",
    when: "Para mapear causas com a equipe antes de escolher onde agir.",
    steps: [
      "Escreva o efeito (o problema) na cabeça do peixe.",
      "Para cada grupo, liste as causas possíveis. Não julgue nesta etapa.",
      "Marque as causas mais prováveis e confirme com dados (o Pareto ajuda).",
      "Gere ações para as causas confirmadas.",
    ],
  },
  pareto: {
    label: "Análise de Pareto",
    summary: "Mostra quais poucas categorias respondem pela maior parte do problema (regra 80/20).",
    when: "Quando há dados de ocorrências, perdas, reclamações ou custos por categoria.",
    steps: [
      "Escolha o que medir (ex.: reclamações, horas perdidas, R$ de retrabalho) e o período.",
      "Lance o total de cada categoria. Use a mesma unidade para todas.",
      "O gráfico ordena do maior para o menor e soma o acumulado.",
      "As categorias até cerca de 80% do total são as “poucas vitais”: concentre a ação nelas.",
    ],
  },
};

// ---------------------------------------------------------------------------
// Normalização: aceita qualquer JSON e devolve o formato esperado, com limites.
// ---------------------------------------------------------------------------
const MAX_ITEMS = 60;
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const idOf = (v: unknown, i: number) => (typeof v === "string" && /^[a-z0-9-]{1,40}$/i.test(v) ? v : `i${i}`);
const note = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
};

function textItems(v: unknown): TextItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x, i) => ({ id: idOf(x?.id, i), text: str(x?.text) }))
    .filter((x) => x.text)
    .slice(0, MAX_ITEMS);
}

export function normalize<K extends ToolKind>(kind: K, raw: unknown): ToolData[K] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = (() => {
    switch (kind) {
      case "swot":
        return {
          forcas: textItems(r.forcas),
          fraquezas: textItems(r.fraquezas),
          oportunidades: textItems(r.oportunidades),
          ameacas: textItems(r.ameacas),
        } satisfies SwotData;
      case "gut":
        return {
          items: (Array.isArray(r.items) ? r.items : [])
            .map((x, i) => ({ id: idOf(x?.id, i), text: str(x?.text), g: note(x?.g), u: note(x?.u), t: note(x?.t) }))
            .filter((x) => x.text)
            .slice(0, MAX_ITEMS),
        } satisfies GutData;
      case "cinco_porques":
        return {
          problema: str(r.problema, 1000),
          porques: (Array.isArray(r.porques) ? r.porques : []).map((x) => str(x, 1000)).slice(0, 7),
          causa_raiz: str(r.causa_raiz, 1000),
          contramedida: str(r.contramedida, 1000),
        } satisfies WhyData;
      case "ishikawa": {
        const c = (r.causas && typeof r.causas === "object" ? r.causas : {}) as Record<string, unknown>;
        return {
          efeito: str(r.efeito, 1000),
          causas: Object.fromEntries(ISHIKAWA_CATS.map(({ key }) => [key, textItems(c[key])])) as Record<IshikawaCat, TextItem[]>,
        } satisfies IshikawaData;
      }
      case "pareto":
        return {
          unidade: str(r.unidade, 60),
          items: (Array.isArray(r.items) ? r.items : [])
            .map((x, i) => {
              const valor = Number(String(x?.valor ?? "").replace(",", "."));
              return { id: idOf(x?.id, i), categoria: str(x?.categoria, 200), valor: Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : 0 };
            })
            .filter((x) => x.categoria)
            .slice(0, MAX_ITEMS),
        } satisfies ParetoData;
    }
  })();
  return out as ToolData[K];
}

export function emptyData(kind: ToolKind) {
  return normalize(kind, {});
}

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------
export function gutScore(i: { g: number; u: number; t: number }) {
  return i.g * i.u * i.t;
}

export function gutRanking(items: GutItem[]) {
  return [...items].map((i) => ({ ...i, score: gutScore(i) })).sort((a, b) => b.score - a.score);
}

/** Linhas do Pareto: ordenadas, com % e % acumulado; "vital" até cruzar 80%. */
export function paretoRows(items: ParetoItem[], threshold = 80) {
  const sorted = [...items].filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor || a.categoria.localeCompare(b.categoria, "pt-BR"));
  const total = sorted.reduce((s, i) => s + i.valor, 0);
  let acc = 0;
  let crossed = false;
  return {
    total,
    rows: sorted.map((i) => {
      const before = acc;
      acc += i.valor;
      const pct = total ? (i.valor / total) * 100 : 0;
      const cum = total ? (acc / total) * 100 : 0;
      // Entra como vital enquanto o acumulado anterior não tinha chegado ao limite.
      const vital = !crossed && (total ? (before / total) * 100 : 0) < threshold;
      if (cum >= threshold) crossed = true;
      return { ...i, pct, cum, vital };
    }),
  };
}

// ---------------------------------------------------------------------------
// Itens que podem virar ação no plano
// ---------------------------------------------------------------------------
export type ActionCandidate = { key: string; group: string; text: string };

export function actionCandidates(kind: ToolKind, raw: unknown): ActionCandidate[] {
  switch (kind) {
    case "swot": {
      const d = normalize("swot", raw);
      return SWOT_QUADRANTS.flatMap((q) => d[q.key].map((i) => ({ key: `${q.key}:${i.id}`, group: q.label, text: i.text })));
    }
    case "gut":
      return gutRanking(normalize("gut", raw).items).map((i) => ({ key: `gut:${i.id}`, group: `GUT ${i.score}`, text: i.text }));
    case "cinco_porques": {
      const d = normalize("cinco_porques", raw);
      const text = d.contramedida || d.causa_raiz;
      return text ? [{ key: "contramedida", group: "Contramedida", text }] : [];
    }
    case "ishikawa": {
      const d = normalize("ishikawa", raw);
      return ISHIKAWA_CATS.flatMap((c) => d.causas[c.key].map((i) => ({ key: `${c.key}:${i.id}`, group: c.label, text: i.text })));
    }
    case "pareto":
      return paretoRows(normalize("pareto", raw).items).rows
        .filter((r) => r.vital)
        .map((r) => ({ key: `pareto:${r.id}`, group: "Poucos vitais", text: r.categoria }));
  }
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

export function toolTable(kind: ToolKind, raw: unknown): { header: string[]; rows: (string | number)[][] } {
  switch (kind) {
    case "swot": {
      const d = normalize("swot", raw);
      return { header: ["Quadrante", "Item"], rows: SWOT_QUADRANTS.flatMap((q) => d[q.key].map((i) => [q.label, i.text])) };
    }
    case "gut":
      return {
        header: ["Posição", "Problema", "Gravidade", "Urgência", "Tendência", "Pontuação GUT"],
        rows: gutRanking(normalize("gut", raw).items).map((i, n) => [n + 1, i.text, i.g, i.u, i.t, i.score]),
      };
    case "cinco_porques": {
      const d = normalize("cinco_porques", raw);
      return {
        header: ["Etapa", "Descrição"],
        rows: [
          ["Problema", d.problema],
          ...d.porques.filter(Boolean).map((p, i) => [`Por quê ${i + 1}`, p]),
          ["Causa raiz", d.causa_raiz],
          ["Contramedida", d.contramedida],
        ],
      };
    }
    case "ishikawa": {
      const d = normalize("ishikawa", raw);
      return {
        header: ["Grupo", "Causa", "Efeito"],
        rows: ISHIKAWA_CATS.flatMap((c) => d.causas[c.key].map((i) => [c.label, i.text, d.efeito])),
      };
    }
    case "pareto": {
      const d = normalize("pareto", raw);
      const { rows } = paretoRows(d.items);
      return {
        header: ["Categoria", `Valor${d.unidade ? ` (${d.unidade})` : ""}`, "% do total", "% acumulado", "Entre os poucos vitais?"],
        rows: rows.map((r) => [r.categoria, fmt(r.valor, 2), fmt(r.pct), fmt(r.cum), r.vital ? "Sim" : "Não"]),
      };
    }
  }
}

export function isToolKind(v: unknown): v is ToolKind {
  return typeof v === "string" && (TOOL_KINDS as string[]).includes(v);
}
