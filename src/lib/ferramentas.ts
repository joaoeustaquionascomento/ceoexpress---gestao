/**
 * Ferramentas de gestão: definição de cada uma, normalização do conteúdo
 * (o JSON salvo no banco), cálculos (GUT, Pareto), linhas para CSV e itens
 * que podem virar ação no plano. Funções puras, sem acesso ao banco.
 *
 * Os textos de ajuda foram escritos para o app; não reproduzem obras de terceiros.
 */

export type BoardKind = "canvas" | "pestel" | "porter" | "eisenhower" | "pdca";
export type ToolKind = "swot" | "gut" | "cinco_porques" | "ishikawa" | "pareto" | "bsc" | "okr" | BoardKind;
export const TOOL_KINDS: ToolKind[] = [
  "swot", "gut", "cinco_porques", "ishikawa", "pareto",
  "canvas", "bsc", "okr",
  "pdca", "eisenhower", "pestel", "porter",
];
export const BOARD_KINDS: BoardKind[] = ["canvas", "pestel", "porter", "eisenhower", "pdca"];
export const isBoardKind = (k: ToolKind): k is BoardKind => (BOARD_KINDS as string[]).includes(k);

/** Grupo de cada ferramenta, para organizar a lista de escolha. */
export const TOOL_GROUPS: { label: string; kinds: ToolKind[] }[] = [
  { label: "Diagnóstico", kinds: ["swot", "gut", "cinco_porques", "ishikawa", "pareto"] },
  { label: "Estratégia", kinds: ["canvas", "bsc", "okr"] },
  { label: "Execução e ambiente", kinds: ["pdca", "eisenhower", "pestel", "porter"] },
];

export type TextItem = { id: string; text: string };

export type SwotData = { forcas: TextItem[]; fraquezas: TextItem[]; oportunidades: TextItem[]; ameacas: TextItem[] };
export type GutItem = { id: string; text: string; g: number; u: number; t: number };
export type GutData = { items: GutItem[] };
export type WhyData = { problema: string; porques: string[]; causa_raiz: string; contramedida: string };
export type IshikawaData = { efeito: string; causas: Record<IshikawaCat, TextItem[]> };
export type ParetoItem = { id: string; categoria: string; valor: number };
export type ParetoData = { unidade: string; items: ParetoItem[] };

/** Quadro genérico: um campo de foco e seções com listas de itens (e nota opcional por seção). */
export type BoardData = { foco: string; secoes: Record<string, TextItem[]>; notas: Record<string, number> };
export type BscPerspective = "financeira" | "clientes" | "processos" | "aprendizado";
export type BscObjective = { id: string; text: string; indicador: string; meta: string };
export type BscData = { visao: string; perspectivas: Record<BscPerspective, BscObjective[]> };
export type OkrKr = { id: string; text: string; inicial: number; meta: number; atual: number };
export type OkrObjective = { id: string; text: string; krs: OkrKr[] };
export type OkrData = { periodo: string; objetivos: OkrObjective[] };

export type ToolData = {
  swot: SwotData;
  gut: GutData;
  cinco_porques: WhyData;
  ishikawa: IshikawaData;
  pareto: ParetoData;
  bsc: BscData;
  okr: OkrData;
} & Record<BoardKind, BoardData>;

export type BoardSection = { key: string; label: string; hint: string; tone?: "ok" | "bad" | "info" | "warn" };
export type BoardConfig = {
  foco: { label: string; placeholder: string };
  sections: BoardSection[];
  /** Nota de 1 a 5 por seção (0 = não avaliada). */
  rating?: { label: string; levels: [string, string, string, string, string] };
  /** Seções cujos itens podem virar ação no plano. */
  actionable: string[];
  columns: 2 | 3;
};

const IMPACT_LEVELS: [string, string, string, string, string] = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"];

export const BOARDS: Record<BoardKind, BoardConfig> = {
  canvas: {
    foco: { label: "Negócio ou unidade analisada", placeholder: "Ex.: Linha de serviços de manutenção" },
    columns: 3,
    actionable: [],
    sections: [
      { key: "parcerias", label: "Parcerias principais", hint: "Fornecedores e parceiros sem os quais o modelo não funciona" },
      { key: "atividades", label: "Atividades principais", hint: "O que a empresa precisa fazer muito bem para entregar a proposta" },
      { key: "recursos", label: "Recursos principais", hint: "Pessoas, ativos, marcas, sistemas e conhecimentos essenciais" },
      { key: "proposta", label: "Proposta de valor", hint: "Que problema resolve e por que o cliente escolhe a empresa", tone: "info" },
      { key: "relacionamento", label: "Relacionamento com clientes", hint: "Como conquista, atende e mantém os clientes" },
      { key: "canais", label: "Canais", hint: "Por onde o cliente conhece, compra e recebe" },
      { key: "clientes", label: "Segmentos de clientes", hint: "Para quem a empresa cria valor; quem paga" },
      { key: "custos", label: "Estrutura de custos", hint: "Principais custos para operar o modelo", tone: "bad" },
      { key: "receitas", label: "Fontes de receita", hint: "Como e quanto o cliente paga; recorrência", tone: "ok" },
    ],
  },
  pestel: {
    foco: { label: "Mercado ou região analisada", placeholder: "Ex.: Mercado nacional de construção" },
    columns: 3,
    rating: { label: "Impacto no negócio", levels: IMPACT_LEVELS },
    actionable: ["politico", "economico", "social", "tecnologico", "ambiental", "legal"],
    sections: [
      { key: "politico", label: "Político", hint: "Governo, políticas públicas, estabilidade, incentivos" },
      { key: "economico", label: "Econômico", hint: "Juros, inflação, câmbio, crédito, renda, demanda" },
      { key: "social", label: "Social", hint: "Hábitos, demografia, mão de obra, cultura" },
      { key: "tecnologico", label: "Tecnológico", hint: "Novas tecnologias, automação, digitalização" },
      { key: "ambiental", label: "Ambiental", hint: "Clima, recursos naturais, exigências de sustentabilidade" },
      { key: "legal", label: "Legal", hint: "Leis, normas, tributos, licenças, proteção de dados" },
    ],
  },
  porter: {
    foco: { label: "Setor analisado", placeholder: "Ex.: Distribuição de materiais elétricos na região" },
    columns: 3,
    rating: { label: "Intensidade da força", levels: IMPACT_LEVELS },
    actionable: ["rivalidade", "entrantes", "substitutos", "clientes", "fornecedores"],
    sections: [
      { key: "rivalidade", label: "Rivalidade entre concorrentes", hint: "Quantos são, guerra de preço, diferenciação", tone: "info" },
      { key: "entrantes", label: "Ameaça de novos entrantes", hint: "Facilidade para alguém novo entrar no mercado" },
      { key: "substitutos", label: "Ameaça de substitutos", hint: "Outras soluções que atendem a mesma necessidade" },
      { key: "clientes", label: "Poder de negociação dos clientes", hint: "Concentração de clientes, facilidade de trocar de fornecedor" },
      { key: "fornecedores", label: "Poder de negociação dos fornecedores", hint: "Dependência de poucos fornecedores, custo de troca" },
    ],
  },
  eisenhower: {
    foco: { label: "Área ou pessoa e período", placeholder: "Ex.: Direção, próximas duas semanas" },
    columns: 2,
    actionable: ["fazer", "agendar", "delegar"],
    sections: [
      { key: "fazer", label: "Fazer agora", hint: "Urgente e importante", tone: "bad" },
      { key: "agendar", label: "Agendar", hint: "Importante, mas não urgente", tone: "ok" },
      { key: "delegar", label: "Delegar", hint: "Urgente, mas não importante", tone: "warn" },
      { key: "eliminar", label: "Eliminar", hint: "Nem urgente nem importante", tone: "info" },
    ],
  },
  pdca: {
    foco: { label: "Objetivo ou problema a resolver", placeholder: "Ex.: Reduzir atrasos nas entregas" },
    columns: 2,
    actionable: ["planejar", "agir"],
    sections: [
      { key: "planejar", label: "Planejar (P)", hint: "Meta, causas, o que será feito, por quem e até quando", tone: "info" },
      { key: "executar", label: "Executar (D)", hint: "O que foi feito e como; treinamentos e registros" },
      { key: "checar", label: "Checar (C)", hint: "Resultados medidos comparados à meta", tone: "warn" },
      { key: "agir", label: "Agir (A)", hint: "Padronizar o que deu certo; corrigir o que não deu", tone: "ok" },
    ],
  },
};

export const BSC_PERSPECTIVES: { key: BscPerspective; label: string; hint: string }[] = [
  { key: "financeira", label: "Financeira", hint: "Resultado, margem, caixa, crescimento" },
  { key: "clientes", label: "Clientes", hint: "Satisfação, retenção, participação, prazos" },
  { key: "processos", label: "Processos internos", hint: "Qualidade, produtividade, prazos internos" },
  { key: "aprendizado", label: "Aprendizado e crescimento", hint: "Pessoas, competências, sistemas, cultura" },
];

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
  canvas: {
    label: "Modelo de negócio (Canvas)",
    summary: "Mostra em uma página como a empresa cria, entrega e captura valor, em nove blocos.",
    when: "Para entender o negócio como um todo, testar mudanças no modelo ou alinhar sócios e liderança.",
    steps: [
      "Comece pelos segmentos de clientes e pela proposta de valor: tudo o mais depende deles.",
      "Preencha canais, relacionamento e fontes de receita (o lado do cliente).",
      "Depois atividades, recursos, parcerias e custos (o lado da operação).",
      "Confira a coerência: cada custo relevante sustenta algo que o cliente valoriza? Anote as conclusões.",
    ],
  },
  bsc: {
    label: "Balanced Scorecard (BSC)",
    summary: "Traduz a estratégia em objetivos, indicadores e metas em quatro perspectivas equilibradas.",
    when: "Depois do diagnóstico, para transformar a estratégia em metas acompanháveis.",
    steps: [
      "Escreva a visão ou o foco estratégico do período.",
      "Em cada perspectiva, defina poucos objetivos (de 2 a 4).",
      "Para cada objetivo, escolha um indicador mensurável e a meta com prazo.",
      "Verifique a lógica de baixo para cima: pessoas e sistemas melhoram processos, que satisfazem clientes, que geram resultado.",
    ],
  },
  okr: {
    label: "OKR (objetivos e resultados-chave)",
    summary: "Define poucos objetivos inspiradores e resultados-chave mensuráveis para um ciclo curto.",
    when: "Para focar a equipe em prioridades de um trimestre ou semestre e acompanhar o avanço.",
    steps: [
      "Defina o período (ex.: 1º trimestre) e até 3 objetivos qualitativos.",
      "Para cada objetivo, de 2 a 4 resultados-chave com número de partida, meta e valor atual.",
      "Atualize o valor atual a cada semana ou quinzena; o progresso é calculado sozinho.",
      "No fim do ciclo, registre o aprendizado nas conclusões e planeje o próximo.",
    ],
  },
  pdca: {
    label: "Ciclo PDCA",
    summary: "Organiza uma melhoria em quatro etapas: planejar, executar, checar e agir.",
    when: "Para conduzir uma melhoria contínua ou resolver um problema com método.",
    steps: [
      "Escreva o objetivo ou problema e, em Planejar, a meta, as causas e o que será feito.",
      "Em Executar, registre o que foi feito de fato.",
      "Em Checar, compare o resultado medido com a meta.",
      "Em Agir, padronize o que funcionou e corrija o que não funcionou. Se a meta não foi atingida, gire o ciclo de novo.",
    ],
  },
  eisenhower: {
    label: "Matriz de Eisenhower",
    summary: "Separa tarefas por urgência e importância para decidir o que fazer, agendar, delegar ou eliminar.",
    when: "Quando a agenda está cheia e tudo parece urgente.",
    steps: [
      "Liste as tarefas e coloque cada uma no quadrante certo.",
      "Faça agora o que é urgente e importante.",
      "Reserve horário na agenda para o importante não urgente: é onde está o maior ganho.",
      "Delegue o urgente pouco importante e elimine o resto.",
    ],
  },
  pestel: {
    label: "Análise PESTEL",
    summary: "Examina fatores externos políticos, econômicos, sociais, tecnológicos, ambientais e legais.",
    when: "Antes do planejamento estratégico ou de entrar em um novo mercado.",
    steps: [
      "Defina o mercado ou a região analisada.",
      "Em cada fator, liste as tendências que afetam o negócio, com fonte quando houver.",
      "Dê uma nota de impacto para cada fator.",
      "Os fatores de maior impacto alimentam as oportunidades e ameaças da SWOT e as ações do plano.",
    ],
  },
  porter: {
    label: "5 Forças de Porter",
    summary: "Avalia a pressão competitiva do setor por cinco forças que afetam a rentabilidade.",
    when: "Para entender a atratividade do setor e onde a empresa precisa se proteger.",
    steps: [
      "Defina o setor e a região.",
      "Em cada força, liste os fatos que aumentam ou diminuem a pressão.",
      "Dê uma nota de intensidade para cada força.",
      "As forças mais intensas indicam onde agir: diferenciação, fidelização, novos fornecedores, contratos.",
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

/** Número livre (aceita vírgula); inválido vira 0. */
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
/** Nota de 0 (não avaliada) a 5. */
const rating = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0;
};

/** Progresso de um resultado-chave, de 0 a 100%. */
export function krProgress(k: { inicial: number; meta: number; atual: number }): number {
  if (k.meta === k.inicial) return k.atual === k.meta ? 100 : 0;
  const p = ((k.atual - k.inicial) / (k.meta - k.inicial)) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}

/** Progresso de um objetivo: média dos seus resultados-chave. */
export function okrProgress(o: { krs: { inicial: number; meta: number; atual: number }[] }): number {
  if (!o.krs.length) return 0;
  return Math.round(o.krs.reduce((s, k) => s + krProgress(k), 0) / o.krs.length);
}

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
      case "bsc": {
        const p = (r.perspectivas && typeof r.perspectivas === "object" ? r.perspectivas : {}) as Record<string, unknown>;
        return {
          visao: str(r.visao, 1000),
          perspectivas: Object.fromEntries(
            BSC_PERSPECTIVES.map(({ key }) => [
              key,
              (Array.isArray(p[key]) ? (p[key] as Record<string, unknown>[]) : [])
                .map((x, i) => ({ id: idOf(x?.id, i), text: str(x?.text), indicador: str(x?.indicador, 300), meta: str(x?.meta, 300) }))
                .filter((x) => x.text)
                .slice(0, 20),
            ]),
          ) as Record<BscPerspective, BscObjective[]>,
        } satisfies BscData;
      }
      case "okr":
        return {
          periodo: str(r.periodo, 100),
          objetivos: (Array.isArray(r.objetivos) ? r.objetivos : [])
            .map((o, i) => ({
              id: idOf(o?.id, i),
              text: str(o?.text),
              krs: (Array.isArray(o?.krs) ? o.krs : [])
                .map((k: Record<string, unknown>, j: number) => ({ id: idOf(k?.id, j), text: str(k?.text), inicial: num(k?.inicial), meta: num(k?.meta), atual: num(k?.atual) }))
                .filter((k: OkrKr) => k.text)
                .slice(0, 10),
            }))
            .filter((o) => o.text)
            .slice(0, 10),
        } satisfies OkrData;
      default: {
        const cfg = BOARDS[kind as BoardKind];
        const sec = (r.secoes && typeof r.secoes === "object" ? r.secoes : {}) as Record<string, unknown>;
        const nts = (r.notas && typeof r.notas === "object" ? r.notas : {}) as Record<string, unknown>;
        return {
          foco: str(r.foco, 300),
          secoes: Object.fromEntries(cfg.sections.map(({ key }) => [key, textItems(sec[key])])),
          notas: cfg.rating ? Object.fromEntries(cfg.sections.map(({ key }) => [key, rating(nts[key])])) : {},
        } satisfies BoardData;
      }
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
    case "bsc": {
      const d = normalize("bsc", raw);
      return BSC_PERSPECTIVES.flatMap((p) =>
        d.perspectivas[p.key].map((o) => ({ key: `${p.key}:${o.id}`, group: p.label, text: o.meta ? `${o.text} (meta: ${o.meta})` : o.text })),
      );
    }
    case "okr": {
      const d = normalize("okr", raw);
      return d.objetivos.flatMap((o) =>
        o.krs.filter((k) => krProgress(k) < 100).map((k) => ({ key: `kr:${o.id}:${k.id}`, group: `Objetivo: ${o.text}`, text: k.text })),
      );
    }
    default: {
      const cfg = BOARDS[kind];
      const d = normalize(kind, raw);
      return cfg.sections
        .filter((sec) => cfg.actionable.includes(sec.key))
        .flatMap((sec) => d.secoes[sec.key].map((i) => ({ key: `${sec.key}:${i.id}`, group: sec.label, text: i.text })));
    }
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
    case "bsc": {
      const d = normalize("bsc", raw);
      return {
        header: ["Perspectiva", "Objetivo", "Indicador", "Meta"],
        rows: BSC_PERSPECTIVES.flatMap((p) => d.perspectivas[p.key].map((o) => [p.label, o.text, o.indicador, o.meta])),
      };
    }
    case "okr": {
      const d = normalize("okr", raw);
      return {
        header: ["Objetivo", "Resultado-chave", "Partida", "Meta", "Atual", "Progresso (%)"],
        rows: d.objetivos.flatMap((o) => o.krs.map((k) => [o.text, k.text, fmt(k.inicial, 2), fmt(k.meta, 2), fmt(k.atual, 2), krProgress(k)])),
      };
    }
    default: {
      const cfg = BOARDS[kind];
      const d = normalize(kind, raw);
      return {
        header: cfg.rating ? ["Seção", "Item", cfg.rating.label] : ["Seção", "Item"],
        rows: cfg.sections.flatMap((sec) =>
          d.secoes[sec.key].map((i) => {
            const n = d.notas[sec.key] ?? 0;
            return cfg.rating ? [sec.label, i.text, n ? `${n} · ${cfg.rating.levels[n - 1]}` : "Não avaliado"] : [sec.label, i.text];
          }),
        ),
      };
    }
  }
}

export function isToolKind(v: unknown): v is ToolKind {
  return typeof v === "string" && (TOOL_KINDS as string[]).includes(v);
}
