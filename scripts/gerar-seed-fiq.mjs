// Gera supabase/seed/fiq-brasil.sql a partir do conteúdo exportado do portal
// original (data/fiq/*.json). Rodar: node scripts/gerar-seed-fiq.mjs
// O SQL é idempotente: ids determinísticos e "on conflict" em todas as tabelas.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const base = JSON.parse(readFileSync("data/fiq/base-inicial.json", "utf8"));
const { requestItems, itemInstructions } = JSON.parse(readFileSync("data/fiq/itens-solicitacoes.json", "utf8"));
const prioridades = JSON.parse(readFileSync("data/fiq/prioridades.json", "utf8"));

/** UUID determinístico (formato v5) a partir de um nome. */
function uid(name) {
  const h = createHash("sha1").update("ceoexpress:" + name).digest("hex");
  const variant = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const COMPANY = uid("empresa:fiq");
const PROJECT = uid("projeto:fiq");

// Categoria e pasta de cada pedido. O portal original não classificava os
// pedidos; esta classificação foi inferida pelo conteúdo e pode ser ajustada.
const categoria = {
  D01: ["Institucional e contrato", "01_DOCUMENTOS_INSTITUCIONAIS"],
  D02: ["Financeiro", "02_FINANCEIRO"],
  D03: ["Financeiro", "02_FINANCEIRO"],
  D04: ["Financeiro", "02_FINANCEIRO"],
  D05: ["Financeiro", "02_FINANCEIRO"],
  D06: ["Operacional", "04_OPERACIONAL"],
  D07: ["Comercial", "03_COMERCIAL"],
  D08: ["Financeiro", "02_FINANCEIRO"],
  D09: ["Planejamento estratégico", "06_PLANEJAMENTO_ESTRATEGICO"],
  D10: ["Comercial", "03_COMERCIAL"],
  D11: ["Operacional", "04_OPERACIONAL"],
  D12: ["Sistemas e processos", "04_OPERACIONAL"],
  D13: ["Recursos humanos", "05_RECURSOS_HUMANOS"],
  D14: ["Planejamento estratégico", "06_PLANEJAMENTO_ESTRATEGICO"],
  D15: ["Contábil e tributário", "02_FINANCEIRO"],
  D16: ["Financeiro", "02_FINANCEIRO"],
};
// Mesmos formatos aceitos pelo portal original.
const FORMATOS = ["pdf", "xlsx", "xls", "docx", "doc", "pptx", "ppt", "csv", "txt", "png", "jpg", "jpeg", "webp"];
const PASSO_A_PASSO = [
  "1. Leia a orientação de cada subitem.",
  '2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).',
  "3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.",
  "4. Marque os subitens atendidos pelo arquivo e confirme o envio.",
  '5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.',
].join("\n");

const out = [];
out.push("-- Gerado por scripts/gerar-seed-fiq.mjs. Não editar à mão.");
out.push("-- Conteúdo de origem: portal CEOEXPRESS | Gestão FIQ Brasil (versão 10, commit bb4c9168).");
out.push("begin;");
out.push(`insert into public.companies (id, legal_name, trade_name) values (${q(COMPANY)}, 'FIQ Brasil', 'FIQ Brasil')
  on conflict (id) do nothing;`);
out.push(`insert into public.projects (id, company_id, name, kind, description, starts_on, status, monthly_hours, drive_folder_url) values (
  ${q(PROJECT)}, ${q(COMPANY)}, 'Planejamento e execução 2026–2027', 'Assessoria em gestão estratégica',
  'Primeiro ciclo: caixa e obrigações (P1), margem e processo (P2), orçamento e escolhas (P3).',
  '2026-11-23', 'ativo', 20, 'https://drive.google.com/drive/folders/1lCo_Wt5s-dIATh7jf4rX2FGmkKSB_UeN')
  on conflict (id) do nothing;`);

// Prioridades estratégicas (P1–P3) com quem decide e como verificar.
Object.entries(prioridades).forEach(([code, [name, decide, inputs, verify]], i) => {
  out.push(`insert into public.objectives (id, company_id, project_id, code, name, who_decides, decision_inputs, verification, sort_order) values (
  ${q(uid("obj:" + code))}, ${q(COMPANY)}, ${q(PROJECT)}, ${q(code)}, ${q(name)}, ${q(decide)}, ${q(inputs)}, ${q(verify)}, ${i})
  on conflict (id) do nothing;`);
});

// Pedidos de informação D01–D16 com subitens e orientações.
base.data.forEach((r, i) => {
  const [code, title, content, owner, due, accept, why] = r;
  const [cat, folder] = categoria[code] ?? ["Outros", "09_ENTREGAVEIS"];
  const checklist = (requestItems[code] ?? []).map((item) => ({ item, instrucao: itemInstructions[item] ?? null }));
  out.push(`insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  ${q(uid("req:" + code))}, ${q(COMPANY)}, ${q(PROJECT)}, ${q(code)}, ${q(title)}, ${q(cat)}, ${q(folder)}, ${q(owner)}, ${q(due)}, 'nao_iniciado',
  ${q(content)}, ${q(why)}, ${q(accept)}, array[${FORMATOS.map(q).join(",")}], ${q(PASSO_A_PASSO)}, ${qj(checklist)}, ${i})
  on conflict (id) do nothing;`);
});

// Plano de ação (5W2H) A01–A30, ligado às prioridades P1–P3.
base.actions.forEach((a) => {
  out.push(`insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  ${q(uid("acao:" + a.id))}, ${q(COMPANY)}, ${q(PROJECT)}, 'acao_5w2h', ${q(a.id)}, ${q(uid("obj:" + a.priority))},
  ${q(a.what)}, ${q(a.why)}, ${q(a.where)}, ${q(a.how)}, ${q(a.owner)}, ${q(a.start)}, ${q(a.due)}, ${q(a.cost)},
  ${q(a.dep)}, ${q(a.base)}, ${q(a.accept)}, ${q(a.evidence)}, 'a_fazer')
  on conflict (id) do nothing;`);
});

// Agenda do primeiro ciclo: cada encontro vira reunião e marco.
base.agenda.forEach(([date, title, agenda, output]) => {
  out.push(`insert into public.meetings (id, company_id, project_id, scheduled_on, title, agenda, expected_output) values (
  ${q(uid("reuniao:" + date))}, ${q(COMPANY)}, ${q(PROJECT)}, ${q(date)}, ${q(title)}, ${q(agenda)}, ${q(output)})
  on conflict (id) do nothing;`);
  out.push(`insert into public.milestones (id, company_id, project_id, name, planned_on) values (
  ${q(uid("marco:" + date))}, ${q(COMPANY)}, ${q(PROJECT)}, ${q(output)}, ${q(date)})
  on conflict (id) do nothing;`);
});

// Registro de decisões, lacunas, hipóteses e premissas. Como no portal
// original, fica visível só à consultoria até ser aprovado.
const kindMap = { "Decisão": "decisao", Lacuna: "lacuna", "Hipótese": "hipotese", Premissa: "premissa" };
const statusMap = { "Aguardando aprovação": "aguardando", "A apurar": "a_apurar" };
base.record.forEach(([code, kind, summary, basis, who, due, status]) => {
  out.push(`insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  ${q(uid("registro:" + code))}, ${q(COMPANY)}, ${q(PROJECT)}, ${q(code)}, ${q(kindMap[kind] ?? "decisao")}, ${q(summary)}, ${q(basis)},
  ${q(who)}, ${q(due)}, ${q(statusMap[status] ?? "aguardando")}, 'internal')
  on conflict (id) do nothing;`);
});

out.push("commit;");
mkdirSync("supabase/seed", { recursive: true });
writeFileSync("supabase/seed/fiq-brasil.sql", out.join("\n\n") + "\n");
console.log(
  `fiq-brasil.sql: ${base.data.length} pedidos, ${base.actions.length} ações, ${base.agenda.length} reuniões, ` +
    `${base.record.length} registros, ${Object.keys(prioridades).length} prioridades`,
);
