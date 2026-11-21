import {
  ISHIKAWA_CATS,
  SWOT_QUADRANTS,
  TOOLS,
  gutRanking,
  isToolKind,
  normalize,
  paretoRows,
} from "@/lib/ferramentas";
import type { DossierAction, DossierDecision, DossierProject, DossierRequest, DossierTool, ReportContent } from "./conteudo";

/**
 * Relatório automático por regras: monta o texto a partir dos números e do
 * conteúdo das ferramentas, sem IA e sem custo. Cada frase vem de uma regra
 * fixa e genérica, que vale para qualquer cliente.
 */

export type ProjectData = {
  project: DossierProject;
  requests: DossierRequest[];
  actions: DossierAction[];
  decisions: DossierDecision[];
  tools: DossierTool[];
  today: string;
};

const PRIO_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const PRIO_LABEL: Record<string, string> = { critica: "crítica", alta: "alta", media: "média", baixa: "baixa" };
const ACT_STATUS: Record<string, string> = { a_fazer: "a fazer", em_andamento: "em andamento", bloqueada: "bloqueada", concluida: "concluída", cancelada: "cancelada" };
const REQ_RECEIVED = ["enviado", "em_analise", "complementacao_solicitada", "aprovado"];

const br = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "sem prazo");
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const closed = (s: string) => s === "concluida" || s === "cancelada";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const actLabel = (a: DossierAction) => `${a.code ? `${a.code} · ` : ""}${a.title}`;
const reqLabel = (r: DossierRequest) => `${r.code} · ${r.title}`;

// ---------------------------------------------------------------------------
// Leitura de cada ferramenta (usada no relatório do projeto e na análise)
// ---------------------------------------------------------------------------
type ToolReading = { leitura: string; achados: string[]; implicacoes: string[]; recomendacoes: string[]; vazia: boolean };

export function readTool(tool: DossierTool, linked: DossierAction[] = []): ToolReading {
  const empty = { leitura: "A ferramenta ainda não tem conteúdo salvo.", achados: [], implicacoes: [], recomendacoes: ["Preencher e salvar a ferramenta antes de analisar."], vazia: true };
  if (!isToolKind(tool.kind)) return empty;
  const inPlan = (text: string) => linked.some((a) => a.title.trim().toLowerCase() === text.trim().slice(0, 300).toLowerCase());
  const planNote = (text: string) => (inPlan(text) ? " (já está no plano)" : "");

  switch (tool.kind) {
    case "swot": {
      const d = normalize("swot", tool.data);
      const n = Object.fromEntries(SWOT_QUADRANTS.map((q) => [q.key, d[q.key].length])) as Record<string, number>;
      const total = Object.values(n).reduce((s, v) => s + v, 0);
      if (!total) return empty;
      const internalBalance = n.forcas - n.fraquezas;
      const externalBalance = n.oportunidades - n.ameacas;
      const achados = SWOT_QUADRANTS.filter((q) => d[q.key].length).map(
        (q) => `${q.label} (${d[q.key].length}): ${d[q.key].slice(0, 4).map((i) => i.text).join("; ")}${d[q.key].length > 4 ? "; …" : ""}`,
      );
      const implicacoes = [
        internalBalance >= 0
          ? "Internamente, as forças apontadas igualam ou superam as fraquezas: há base para crescer apoiado no que já funciona."
          : "Internamente, as fraquezas superam as forças: corrigir o básico tende a vir antes de qualquer expansão.",
        externalBalance >= 0
          ? "No ambiente externo, há tantas ou mais oportunidades quanto ameaças: vale escolher quais aproveitar primeiro."
          : "No ambiente externo, as ameaças predominam: convém proteger caixa, clientes e operação antes de novos movimentos.",
      ];
      const recomendacoes = [
        ...d.fraquezas.slice(0, 3).map((i) => `Tratar a fraqueza "${i.text}"${planNote(i.text)}.`),
        ...d.ameacas.slice(0, 2).map((i) => `Definir uma resposta para a ameaça "${i.text}"${planNote(i.text)}.`),
        ...d.oportunidades.slice(0, 2).map((i) => `Avaliar como aproveitar a oportunidade "${i.text}"${planNote(i.text)}.`),
      ];
      return {
        leitura: `A análise SWOT reúne ${plural(total, "item", "itens")}: ${plural(n.forcas, "força", "forças")}, ${plural(n.fraquezas, "fraqueza", "fraquezas")}, ${plural(n.oportunidades, "oportunidade", "oportunidades")} e ${plural(n.ameacas, "ameaça", "ameaças")}.`,
        achados,
        implicacoes,
        recomendacoes,
        vazia: false,
      };
    }
    case "gut": {
      const rank = gutRanking(normalize("gut", tool.data).items).filter((i) => i.text);
      if (!rank.length) return empty;
      const top = rank.slice(0, 5);
      const critical = rank.filter((i) => i.score >= 64);
      return {
        leitura: `A matriz GUT classifica ${plural(rank.length, "problema", "problemas")} por gravidade, urgência e tendência (nota de 1 a 125). O primeiro colocado tem nota ${top[0].score}.`,
        achados: top.map((i, k) => `${k + 1}º ${i.text}: nota ${i.score} (G${i.g} U${i.u} T${i.t})${planNote(i.text)}`),
        implicacoes: [
          critical.length
            ? `${plural(critical.length, "problema tem", "problemas têm")} nota 64 ou mais, faixa que pede ação imediata.`
            : "Nenhum problema chegou à faixa de nota 64 ou mais; há espaço para planejar as correções com calma.",
          "Concentrar esforço nos primeiros colocados traz mais resultado do que atacar todos ao mesmo tempo.",
        ],
        recomendacoes: rank.slice(0, 3).map((i) => `Colocar no plano, com responsável e prazo, o problema "${i.text}"${planNote(i.text)}.`),
        vazia: false,
      };
    }
    case "pareto": {
      const d = normalize("pareto", tool.data);
      const { rows, total } = paretoRows(d.items);
      if (!rows.length) return empty;
      const vital = rows.filter((r) => r.vital);
      const share = vital.length ? vital[vital.length - 1].cum : 0;
      const unit = d.unidade ? ` ${d.unidade}` : "";
      return {
        leitura: `O Pareto soma ${fmt(total)}${unit} em ${plural(rows.length, "categoria", "categorias")}. ${plural(vital.length, "categoria concentra", "categorias concentram")} ${fmt(share)}% do total.`,
        achados: rows.slice(0, 6).map((r) => `${r.categoria}: ${fmt(r.valor)}${unit} (${fmt(r.pct)}%; acumulado ${fmt(r.cum)}%)${r.vital ? ", entre os poucos vitais" : ""}`),
        implicacoes: [
          vital.length <= Math.ceil(rows.length / 3)
            ? "O problema está concentrado em poucas categorias: atacá-las resolve a maior parte do total."
            : "O total está espalhado por muitas categorias: vale revisar o agrupamento ou buscar uma causa comum.",
        ],
        recomendacoes: vital.map((r) => `Investigar as causas de "${r.categoria}" e definir uma ação${planNote(r.categoria)}.`),
        vazia: false,
      };
    }
    case "cinco_porques": {
      const d = normalize("cinco_porques", tool.data);
      const chain = d.porques.filter(Boolean);
      if (!d.problema && !chain.length) return empty;
      const counter = d.contramedida || d.causa_raiz;
      return {
        leitura: `Problema analisado: ${d.problema || "não informado"}. Foram registrados ${plural(chain.length, "porquê", "porquês")}.`,
        achados: [
          ...chain.map((p, i) => `Por quê ${i + 1}: ${p}`),
          d.causa_raiz ? `Causa raiz: ${d.causa_raiz}` : "Causa raiz ainda não definida.",
        ],
        implicacoes: [
          chain.length < 3
            ? "Com menos de três porquês, a causa encontrada pode ser apenas um sintoma. Vale aprofundar."
            : "A cadeia de porquês chegou a uma causa que depende de decisão interna, o que facilita a correção.",
        ],
        recomendacoes: counter
          ? [`Executar a contramedida "${counter}"${planNote(counter)} e medir se o problema volta a ocorrer.`]
          : ["Definir a contramedida para a causa raiz."],
        vazia: false,
      };
    }
    case "ishikawa": {
      const d = normalize("ishikawa", tool.data);
      const groups = ISHIKAWA_CATS.map((c) => ({ ...c, items: d.causas[c.key] })).filter((g) => g.items.length);
      const total = groups.reduce((s, g) => s + g.items.length, 0);
      if (!total) return empty;
      const biggest = [...groups].sort((a, b) => b.items.length - a.items.length)[0];
      return {
        leitura: `O diagrama de Ishikawa reúne ${plural(total, "causa possível", "causas possíveis")} para o efeito "${d.efeito || "não informado"}", em ${plural(groups.length, "grupo", "grupos")}.`,
        achados: groups.map((g) => `${g.label} (${g.items.length}): ${g.items.map((i) => i.text).join("; ")}`),
        implicacoes: [`O grupo com mais causas é ${biggest.label}: é por onde a investigação tende a render mais.`],
        recomendacoes: [
          `Confirmar com dados quais causas de ${biggest.label} realmente acontecem.`,
          ...biggest.items.slice(0, 3).map((i) => `Avaliar ação para "${i.text}"${planNote(i.text)}.`),
        ],
        vazia: false,
      };
    }
  }
}

export function ruleToolReport(tool: DossierTool, linked: DossierAction[]): ReportContent {
  const r = readTool(tool, linked);
  const label = isToolKind(tool.kind) ? TOOLS[tool.kind].label : "Ferramenta";
  return {
    resumo: `${label} "${tool.title}". ${r.leitura}`,
    secoes: [
      { titulo: "Leitura da ferramenta", texto: [r.leitura, tool.notes ? `Conclusões da consultoria: ${tool.notes}` : ""].filter(Boolean).join("\n\n") },
      { titulo: "Principais achados", texto: bullets(r.achados) },
      { titulo: "Implicações para o negócio", texto: bullets(r.implicacoes) },
      { titulo: "Recomendações", texto: bullets(r.recomendacoes) },
      ...(linked.length ? [{ titulo: "Ações já no plano", texto: bullets(linked.map((a) => `${actLabel(a)}: ${ACT_STATUS[a.status] ?? a.status}`)) }] : []),
    ].filter((s) => s.texto),
    lacunas: r.vazia ? ["A ferramenta está vazia."] : tool.notes ? [] : ["A consultoria ainda não registrou conclusões nesta ferramenta."],
  };
}

// ---------------------------------------------------------------------------
// Relatório do projeto
// ---------------------------------------------------------------------------
export function ruleProjectReport(d: ProjectData): ReportContent {
  const { requests, actions, decisions, tools, today, project } = d;
  const in30 = addDays(today, 30);

  const reqApplicable = requests.filter((r) => r.status !== "nao_aplicavel");
  const reqReceived = reqApplicable.filter((r) => REQ_RECEIVED.includes(r.status));
  const reqApproved = reqApplicable.filter((r) => r.status === "aprovado");
  const reqLate = reqApplicable.filter((r) => !REQ_RECEIVED.includes(r.status) && r.due_on && r.due_on < today);
  const reqRedo = reqApplicable.filter((r) => r.status === "complementacao_solicitada");

  const active = actions.filter((a) => a.status !== "cancelada");
  const open = actions.filter((a) => !closed(a.status));
  const done = active.filter((a) => a.status === "concluida");
  const late = open.filter((a) => a.due_on && a.due_on < today);
  const blocked = open.filter((a) => a.status === "bloqueada");
  const noOwner = open.filter((a) => !a.has_owner);
  const noDue = open.filter((a) => !a.due_on);
  const decPending = decisions.filter((x) => x.status === "aguardando" || x.status === "a_apurar");

  const readings = tools.map((t) => ({ t, r: readTool(t, actions.filter((a) => a.source_tool_id === t.id)) })).filter((x) => !x.r.vazia);

  // Resumo
  const resumo = [
    `O projeto tem ${plural(active.length, "ação ativa", "ações ativas")} no plano, ${pct(done.length, active.length)}% concluídas, e ${pct(reqReceived.length, reqApplicable.length)}% das informações pedidas ao cliente já foram recebidas.`,
    late.length || reqLate.length || blocked.length
      ? `Pontos de atenção: ${[
          late.length ? plural(late.length, "ação atrasada", "ações atrasadas") : null,
          blocked.length ? plural(blocked.length, "ação bloqueada", "ações bloqueadas") : null,
          reqLate.length ? plural(reqLate.length, "pedido vencido sem envio", "pedidos vencidos sem envio") : null,
        ].filter(Boolean).join(", ")}.`
      : "Não há ações atrasadas, bloqueios nem pedidos vencidos neste momento.",
    readings.length ? `O diagnóstico conta com ${plural(readings.length, "ferramenta preenchida", "ferramentas preenchidas")}.` : "Nenhuma ferramenta de diagnóstico foi preenchida ainda.",
  ].join(" ");

  // Visão geral
  const visao = [
    `Situação do projeto: ${project.status}. Período: ${project.starts_on ? br(project.starts_on) : "início não informado"} a ${project.ends_on ? br(project.ends_on) : "término não informado"}.`,
    bullets([
      `Pedidos de informação: ${plural(reqApplicable.length, "aplicável", "aplicáveis")}, ${plural(reqReceived.length, "recebido", "recebidos")} (${pct(reqReceived.length, reqApplicable.length)}%) e ${plural(reqApproved.length, "aprovado", "aprovados")} (${pct(reqApproved.length, reqApplicable.length)}%).`,
      `Plano de ação: ${active.length} ações ativas, ${done.length} concluídas (${pct(done.length, active.length)}%), ${open.length} em aberto.`,
      `Decisões e lacunas registradas: ${decisions.length}${decisions.length ? `, das quais ${decPending.length} aguardando definição` : ""}.`,
      `Ferramentas de gestão preenchidas: ${readings.length} de ${tools.length}.`,
    ]),
  ].join("\n\n");

  // Diagnóstico
  const diagnostico = readings.length
    ? readings
        .map(({ t, r }) => {
          const label = isToolKind(t.kind) ? TOOLS[t.kind].label : "Ferramenta";
          return [`${label}, "${t.title}": ${r.leitura}`, bullets([...r.achados.slice(0, 4), ...r.implicacoes.slice(0, 1)]), t.notes ? `Conclusões da consultoria: ${t.notes}` : ""]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n")
    : "Ainda não há ferramentas de diagnóstico preenchidas. Recomenda-se começar por uma análise SWOT e uma matriz GUT dos principais problemas.";

  // Prioridades: ações abertas mais importantes + recomendações das ferramentas ainda fora do plano
  const priorityActions = [...open]
    .sort(
      (a, b) =>
        (PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9) ||
        Number(!(a.due_on && a.due_on < today)) - Number(!(b.due_on && b.due_on < today)) ||
        (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"),
    )
    .slice(0, 8);
  const toolRecs = readings.flatMap(({ r }) => r.recomendacoes.filter((x) => !x.includes("(já está no plano)"))).slice(0, 5);
  const prioridades = [
    priorityActions.length
      ? `Ações do plano que merecem foco agora, por prioridade e prazo:\n${bullets(
          priorityActions.map((a) => `${actLabel(a)}: prioridade ${PRIO_LABEL[a.priority] ?? a.priority}, prazo ${br(a.due_on)}${a.due_on && a.due_on < today ? " (atrasada)" : ""}`),
        )}`
      : "Não há ações em aberto no plano.",
    toolRecs.length ? `Pontos do diagnóstico que ainda não viraram ação:\n${bullets(toolRecs)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Andamento
  const andamento = [
    `${done.length} de ${active.length} ações ativas concluídas (${pct(done.length, active.length)}%). ${late.length ? plural(late.length, "ação está atrasada", "ações estão atrasadas") : "Nenhuma ação está atrasada"} e ${blocked.length ? plural(blocked.length, "está bloqueada", "estão bloqueadas") : "nenhuma está bloqueada"}.`,
    late.length ? `Atrasadas:\n${bullets(late.slice(0, 10).map((a) => `${actLabel(a)} (prazo ${br(a.due_on)})`))}` : "",
    blocked.length ? `Bloqueadas:\n${bullets(blocked.slice(0, 10).map(actLabel))}` : "",
    noOwner.length ? `Sem responsável definido:\n${bullets(noOwner.slice(0, 10).map(actLabel))}` : "",
    noDue.length ? `Sem prazo definido:\n${bullets(noDue.slice(0, 10).map(actLabel))}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Riscos
  const threats = readings.filter(({ t }) => t.kind === "swot").flatMap(({ t }) => normalize("swot", t.data).ameacas.map((i) => i.text));
  const riscos = bullets(
    [
      ...reqLate.slice(0, 8).map((r) => `Informação pendente do cliente: ${reqLabel(r)} (venceu em ${br(r.due_on)}). Pode atrasar a análise e as ações que dependem dela.`),
      ...reqRedo.slice(0, 5).map((r) => `Complementação solicitada e ainda não atendida: ${reqLabel(r)}.`),
      ...blocked.slice(0, 5).map((a) => `Ação bloqueada: ${actLabel(a)}. Precisa de decisão ou destrave.`),
      ...decPending.filter((x) => x.due_on && x.due_on < today).slice(0, 5).map((x) => `Decisão vencida aguardando definição: ${x.code ? `${x.code} · ` : ""}${x.summary}.`),
      noOwner.length > 0 ? `${plural(noOwner.length, "ação aberta não tem", "ações abertas não têm")} responsável: risco de ficar sem andamento.` : null,
      ...threats.slice(0, 3).map((t) => `Ameaça apontada na SWOT: ${t}.`),
    ].filter((x): x is string => Boolean(x)),
  ) || "Nenhum risco relevante identificado pelos dados do sistema neste momento.";

  // Próximos 30 dias
  const soonActions = open.filter((a) => a.due_on && a.due_on >= today && a.due_on <= in30).sort((a, b) => a.due_on!.localeCompare(b.due_on!));
  const soonReqs = reqApplicable.filter((r) => !REQ_RECEIVED.includes(r.status) && r.due_on && r.due_on >= today && r.due_on <= in30);
  const soonDec = decPending.filter((x) => x.due_on && x.due_on >= today && x.due_on <= in30);
  const passos = bullets([
    ...late.slice(0, 5).map((a) => `Recuperar a ação atrasada ${actLabel(a)}.`),
    ...soonActions.slice(0, 10).map((a) => `Concluir ${actLabel(a)} até ${br(a.due_on)}.`),
    ...soonReqs.slice(0, 8).map((r) => `Cliente enviar ${reqLabel(r)} até ${br(r.due_on)}.`),
    ...soonDec.slice(0, 5).map((x) => `Decidir: ${x.summary} (até ${br(x.due_on)}).`),
    noOwner.length ? `Definir responsável para ${plural(noOwner.length, "ação", "ações")} sem dono.` : "",
    noDue.length ? `Definir prazo para ${plural(noDue.length, "ação", "ações")} sem data.` : "",
  ].filter(Boolean)) || "Não há entregas previstas para os próximos 30 dias. Vale revisar o plano e definir as próximas etapas.";

  const lacunas = [
    ...(tools.length === 0 ? ["Nenhuma ferramenta de diagnóstico preenchida."] : []),
    ...(reqApplicable.length - reqReceived.length > 0 ? [`${plural(reqApplicable.length - reqReceived.length, "pedido de informação ainda não recebido", "pedidos de informação ainda não recebidos")}.`] : []),
    ...(noOwner.length ? [`${plural(noOwner.length, "ação sem responsável", "ações sem responsável")}.`] : []),
    ...(noDue.length ? [`${plural(noDue.length, "ação sem prazo", "ações sem prazo")}.`] : []),
    ...readings.filter(({ t }) => !t.notes).map(({ t }) => `Ferramenta "${t.title}" sem conclusões da consultoria.`),
  ];

  return {
    resumo,
    secoes: [
      { titulo: "Visão geral", texto: visao },
      { titulo: "Diagnóstico", texto: diagnostico },
      { titulo: "Prioridades", texto: prioridades },
      { titulo: "Andamento do plano de ação", texto: andamento },
      { titulo: "Riscos e pontos de atenção", texto: riscos },
      { titulo: "Próximos passos (30 dias)", texto: passos },
    ],
    lacunas,
  };
}
