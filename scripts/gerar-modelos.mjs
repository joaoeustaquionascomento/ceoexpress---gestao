// Gera a migração que grava a biblioteca de modelos genérica a partir de
// data/modelos/biblioteca.json. Rodar: node scripts/gerar-modelos.mjs
// Atualiza os modelos com os mesmos códigos (D01–D16, A01–A30) e preserva
// os modelos criados pelo administrador com outros códigos.
import { readFileSync, writeFileSync } from "node:fs";

const lib = JSON.parse(readFileSync("data/modelos/biblioteca.json", "utf8"));
const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const FORMATOS = ["pdf", "xlsx", "xls", "docx", "doc", "pptx", "ppt", "csv", "txt", "png", "jpg", "jpeg", "webp"];
const PASSO_A_PASSO = [
  "1. Leia a orientação de cada subitem.",
  '2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).',
  "3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.",
  "4. Marque os subitens atendidos pelo arquivo e confirme o envio.",
  '5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.',
].join("\n");

const out = [
  "-- Gerado por scripts/gerar-modelos.mjs a partir de data/modelos/biblioteca.json. Não editar à mão.",
  "-- Biblioteca de modelos genérica: sem nomes, pessoas, datas ou termos de um cliente específico.",
  "-- Os pedidos e ações já criados nos projetos não mudam.",
  "",
];

lib.pedidos.forEach((r, i) => {
  const checklist = r.checklist.map(([item, instrucao]) => ({ item, instrucao }));
  out.push(`insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  ${q(r.code)}, ${q(r.title)}, ${q(r.category)}, ${q(r.stage)}, ${q(r.description)}, ${q(r.purpose)}, ${q(r.minimum_content)},
  null, array[${FORMATOS.map(q).join(",")}], ${q(PASSO_A_PASSO)}, ${qj(checklist)}, ${i}, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;`);
});

lib.acoes.forEach(([code, priority, title, rationale, area, how, inputs, criteria], i) => {
  out.push(`insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  ${q(code)}, 'acao_5w2h', ${q(title)}, ${q(rationale)}, ${q(area)}, ${q(how)}, ${q(priority)}, ${q(inputs)},
  null, null, ${q(criteria)}, null, ${i + 1}, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;`);
});

writeFileSync("supabase/migrations/20261121001000_modelos_genericos.sql", out.join("\n") + "\n");
console.log(`${lib.pedidos.length} pedidos e ${lib.acoes.length} ações`);
