/**
 * Dados de um contrato: o que o usuário preenche, os valores padrão e a
 * montagem do texto final a partir do modelo (troca dos campos {{assim}}).
 * Sem dependência do servidor: usado nas telas, nas ações e nos testes.
 */
import { z } from "zod";
import { dataCurta, dataPorExtenso, formatarReais, inteiroPorExtenso, lerData, lerReais, reaisPorExtenso, somarMeses } from "./extenso";

export const CONTRACT_STATUS = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  gerado: { label: "PDF gerado", tone: "info" },
  enviado: { label: "Enviado para assinatura", tone: "warn" },
  assinado: { label: "Assinado", tone: "ok" },
  cancelado: { label: "Cancelado", tone: "bad" },
} as const;
export type ContractStatus = keyof typeof CONTRACT_STATUS;

export type Parcela = { numero: number; valor: number; vencimento: string };

const txt = (max: number) => z.string().trim().max(max).catch("");
const pct = z.coerce.number().min(0).max(100).catch(0);
const dias = z.coerce.number().int().min(0).max(3650).catch(0);

/** Tudo o que o formulário do contrato grava (coluna "data", em JSON). */
export const contractDataSchema = z.object({
  tipo: z.enum(["pf", "pj"]).catch("pj"),
  // Pessoa física
  pf_nome: txt(200),
  pf_cpf: txt(20),
  pf_complemento: txt(300), // nacionalidade, estado civil, profissão
  // Pessoa jurídica
  pj_razao: txt(200),
  pj_cnpj: txt(25),
  rep_nome: txt(200),
  rep_cpf: txt(20),
  rep_cargo: txt(100),
  // Contato e endereço (dos dois tipos)
  endereco: txt(400),
  email: txt(200),
  telefone: txt(40),
  // Serviço
  servico: txt(200),
  preambulo: txt(6000),
  objeto: txt(6000),
  escopo: txt(30000),
  duracao: txt(200),
  data_inicio: txt(10),
  data_termino: txt(10),
  dedicacao: txt(300),
  honorarios: txt(6000),
  condicoes_especiais: txt(30000),
  // Valores
  valor_total: txt(30),
  parcelas: txt(4000), // uma por linha: "15/06/2026 1.000,00"
  forma_pagamento: txt(600),
  multa_atraso: pct,
  juros_mes: pct,
  indice_correcao: txt(60),
  multa_rescisoria: pct,
  prazo_cura: dias,
  aviso_previo: dias,
  sigilo_anos: z.coerce.number().int().min(0).max(50).catch(0),
  // Fechamento
  cidade: txt(120),
  data_assinatura: txt(10),
  foro: txt(120),
  testemunhas: z.boolean().catch(false),
});
export type ContractData = z.infer<typeof contractDataSchema>;

/** Dados da contratada (configurações da área de contratos). */
export type ProviderSettings = {
  provider_name: string;
  provider_document: string;
  provider_qualification: string;
  payment_instructions: string;
  default_city: string;
  default_forum: string;
};

export const EMPTY_SETTINGS: ProviderSettings = {
  provider_name: "",
  provider_document: "",
  provider_qualification: "",
  payment_instructions: "",
  default_city: "",
  default_forum: "",
};

export function defaultData(s: ProviderSettings, today: string): ContractData {
  return contractDataSchema.parse({
    tipo: "pj",
    forma_pagamento: s.payment_instructions,
    multa_atraso: 2,
    juros_mes: 1,
    indice_correcao: "IPCA/IBGE",
    multa_rescisoria: 20,
    prazo_cura: 15,
    aviso_previo: 30,
    sigilo_anos: 2,
    cidade: s.default_city,
    data_assinatura: today,
    foro: s.default_forum,
  });
}

/** Divide o total em parcelas mensais iguais; a diferença de centavos vai para a última. */
export function calcularParcelas(total: number, quantidade: number, primeiroVencimento: string): Parcela[] {
  const n = Math.max(1, Math.min(120, Math.floor(quantidade)));
  const base = Math.floor((total * 100) / n) / 100;
  const out: Parcela[] = [];
  for (let i = 0; i < n; i++) {
    const valor = i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
    out.push({ numero: i + 1, valor, vencimento: somarMeses(primeiroVencimento, i) });
  }
  return out;
}

export function parcelasParaTexto(p: Parcela[]): string {
  return p.map((x) => `${dataCurta(x.vencimento)} ${formatarReais(x.valor).replace("R$ ", "")}`).join("\n");
}

/** Lê as linhas "dd/mm/aaaa valor". Devolve as parcelas ou a mensagem do primeiro erro. */
export function lerParcelas(texto: string): { parcelas: Parcela[] } | { erro: string } {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parcelas: Parcela[] = [];
  for (const [i, linha] of linhas.entries()) {
    const m = /^(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–;:]?\s*(?:R\$\s*)?([\d.,]+)$/.exec(linha);
    const venc = m ? lerData(m[1]) : null;
    const valor = m ? lerReais(m[2]) : null;
    if (!venc || valor === null || valor <= 0) {
      return { erro: `Parcela ${i + 1}: escreva a data e o valor, por exemplo "15/06/2026 1.000,00".` };
    }
    parcelas.push({ numero: i + 1, valor, vencimento: venc });
  }
  return { parcelas };
}

const ORDINAL = (n: number) => `${n}ª`;

/** Texto das parcelas como itens de lista do contrato. */
export function parcelasNoContrato(p: Parcela[]): string {
  if (p.length === 1) {
    const x = p[0];
    return `- Parcela única de ${formatarReais(x.valor)} (${reaisPorExtenso(x.valor)}), com vencimento em ${dataCurta(x.vencimento)}.`;
  }
  return p
    .map((x, i) => `- ${ORDINAL(x.numero)} parcela: ${formatarReais(x.valor)} (${reaisPorExtenso(x.valor)}), com vencimento em ${dataCurta(x.vencimento)}${i === p.length - 1 ? "." : ";"}`)
    .join("\n");
}

const juntar = (partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(", ");

export function qualificacaoContratante(d: ContractData): string {
  if (d.tipo === "pf") {
    return juntar([
      `**${d.pf_nome || "[nome do contratante]"}**`,
      d.pf_complemento,
      `inscrito(a) no CPF sob o nº ${d.pf_cpf || "[CPF]"}`,
      d.endereco && `residente e domiciliado(a) em ${d.endereco}`,
      d.email && `e-mail ${d.email}`,
      d.telefone && `telefone ${d.telefone}`,
    ]);
  }
  return juntar([
    `**${d.pj_razao || "[razão social do contratante]"}**`,
    "pessoa jurídica de direito privado",
    `inscrita no CNPJ sob o nº ${d.pj_cnpj || "[CNPJ]"}`,
    d.endereco && `com sede em ${d.endereco}`,
    d.rep_nome &&
      `neste ato representada por ${juntar([d.rep_nome, d.rep_cargo, d.rep_cpf && `CPF nº ${d.rep_cpf}`])}`,
    d.email && `e-mail ${d.email}`,
    d.telefone && `telefone ${d.telefone}`,
  ]);
}

export function nomeContratante(d: ContractData) {
  return d.tipo === "pf" ? d.pf_nome : d.pj_razao;
}
export function documentoContratante(d: ContractData) {
  return d.tipo === "pf" ? (d.pf_cpf ? `CPF nº ${d.pf_cpf}` : "") : d.pj_cnpj ? `CNPJ nº ${d.pj_cnpj}` : "";
}

const num = (n: number) => String(n).replace(".", ",");
/** 30 → "30 (trinta)"; com casas decimais, só o número. */
const comExtenso = (n: number) => (Number.isInteger(n) ? `${n} (${inteiroPorExtenso(n)})` : num(n));
/** 2 → "2% (dois por cento)"; 2.5 → "2,5%". */
const percentual = (n: number) => (Number.isInteger(n) ? `${n}% (${inteiroPorExtenso(n)} por cento)` : `${num(n)}%`);

/** Campos que os modelos podem usar, com a explicação mostrada no editor de modelos. */
export const PLACEHOLDERS: { key: string; help: string }[] = [
  { key: "contratada_qualificacao", help: "Qualificação completa da contratada (das configurações)" },
  { key: "contratada_nome", help: "Nome da contratada" },
  { key: "contratante_qualificacao", help: "Qualificação completa do contratante, montada a partir do formulário (pessoa física ou jurídica)" },
  { key: "contratante_nome", help: "Nome ou razão social do contratante" },
  { key: "contratante_representante", help: "Quem decide pelo contratante: o representante legal (empresa) ou o próprio contratante (pessoa física)" },
  { key: "contratada_documento", help: "CNPJ ou CPF da contratada (das configurações)" },
  { key: "servico", help: "Nome do serviço (ex.: Consultoria Estratégica)" },
  { key: "servico_maiusculo", help: "Nome do serviço em letras maiúsculas (para o título)" },
  { key: "preambulo", help: "Considerandos (some se ficar em branco)" },
  { key: "objeto", help: "Descrição do objeto" },
  { key: "escopo", help: "Escopo detalhado (Anexo I)" },
  { key: "duracao", help: "Duração prevista" },
  { key: "data_inicio", help: "Data de início (dd/mm/aaaa)" },
  { key: "data_inicio_extenso", help: "Data de início por extenso" },
  { key: "data_termino", help: "Data de término (dd/mm/aaaa)" },
  { key: "data_termino_extenso", help: "Data de término por extenso" },
  { key: "dedicacao", help: "Dedicação (ex.: até 20 (vinte) horas mensais)" },
  { key: "honorarios", help: "Honorários em texto livre (ex.: remuneração variável com piso)" },
  { key: "condicoes_especiais", help: "Condições específicas deste contrato (some se ficar em branco)" },
  { key: "valor_total", help: "Valor total (R$ 0.000,00)" },
  { key: "valor_total_extenso", help: "Valor total por extenso" },
  { key: "parcelas", help: "Lista das parcelas com valores e vencimentos" },
  { key: "forma_pagamento", help: "Forma de pagamento (ex.: PIX, chave …)" },
  { key: "multa_atraso", help: "Multa por atraso (%)" },
  { key: "juros_mes", help: "Juros de mora ao mês (%)" },
  { key: "indice_correcao", help: "Índice de correção monetária" },
  { key: "multa_rescisoria", help: "Multa por descumprimento (%)" },
  { key: "prazo_cura", help: "Dias para corrigir um descumprimento após notificação" },
  { key: "aviso_previo", help: "Dias de aviso prévio para rescisão" },
  { key: "sigilo_anos", help: "Anos de sigilo após o fim do contrato" },
  { key: "cidade", help: "Cidade da assinatura" },
  { key: "data_extenso", help: "Data da assinatura por extenso" },
  { key: "foro", help: "Foro eleito (cidade/UF)" },
  { key: "assinaturas", help: "Quadro de assinaturas (e testemunhas, se marcado)" },
];

/** Campos de texto livre que podem citar outros campos, ex.: {{contratante_representante}} dentro do escopo. */
const TEXTOS_LIVRES = ["preambulo", "objeto", "escopo", "honorarios", "dedicacao", "condicoes_especiais"] as const;

export function valoresDosCampos(d: ContractData, s: ProviderSettings): Record<string, string> {
  const v = valoresBase(d, s);
  for (const k of TEXTOS_LIVRES) {
    v[k] = v[k].replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string) =>
      (TEXTOS_LIVRES as readonly string[]).includes(key) ? m : v[key] || `[falta: ${key}]`);
  }
  return v;
}

function valoresBase(d: ContractData, s: ProviderSettings): Record<string, string> {
  const total = lerReais(d.valor_total);
  const lidas = lerParcelas(d.parcelas);
  const parcelas = "parcelas" in lidas && lidas.parcelas.length ? parcelasNoContrato(lidas.parcelas) : "";
  return {
    contratada_qualificacao: s.provider_qualification,
    contratada_nome: s.provider_name,
    contratante_qualificacao: qualificacaoContratante(d),
    contratante_nome: nomeContratante(d),
    servico: d.servico,
    servico_maiusculo: d.servico.toLocaleUpperCase("pt-BR"),
    preambulo: d.preambulo,
    objeto: d.objeto,
    escopo: d.escopo,
    duracao: d.duracao,
    data_inicio: d.data_inicio ? dataCurta(d.data_inicio) : "",
    data_inicio_extenso: d.data_inicio ? dataPorExtenso(d.data_inicio) : "",
    data_termino: d.data_termino ? dataCurta(d.data_termino) : "",
    data_termino_extenso: d.data_termino ? dataPorExtenso(d.data_termino) : "",
    dedicacao: d.dedicacao,
    honorarios: d.honorarios,
    condicoes_especiais: d.condicoes_especiais,
    contratante_representante: d.tipo === "pf" ? d.pf_nome : d.rep_nome,
    contratada_documento: s.provider_document,
    valor_total: total !== null ? formatarReais(total) : "",
    valor_total_extenso: total !== null ? reaisPorExtenso(total) : "",
    parcelas,
    forma_pagamento: d.forma_pagamento,
    multa_atraso: percentual(d.multa_atraso),
    juros_mes: percentual(d.juros_mes),
    indice_correcao: d.indice_correcao,
    multa_rescisoria: percentual(d.multa_rescisoria),
    prazo_cura: comExtenso(d.prazo_cura),
    aviso_previo: comExtenso(d.aviso_previo),
    sigilo_anos: comExtenso(d.sigilo_anos),
    cidade: d.cidade,
    data_extenso: d.data_assinatura ? dataPorExtenso(d.data_assinatura) : "",
    foro: d.foro,
    assinaturas: "[[assinaturas]]",
  };
}

/**
 * Troca os campos {{chave}} do modelo pelos valores. Um parágrafo que tem só
 * um campo vazio some (ex.: preâmbulo opcional). Campos vazios ou
 * desconhecidos no meio do texto ficam marcados como [falta: chave].
 */
export function montarTexto(modelo: string, valores: Record<string, string>): { texto: string; faltando: string[] } {
  const faltando = new Set<string>();
  const blocos = modelo.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const saida: string[] = [];
  for (const bloco of blocos) {
    const so = /^\s*\{\{\s*([a-z_]+)\s*\}\}\s*$/.exec(bloco);
    if (so) {
      const v = valores[so[1]];
      if (v === undefined) faltando.add(so[1]);
      if (v) saida.push(v.trim());
      else if (v === undefined) saida.push(`[falta: ${so[1]}]`);
      continue;
    }
    saida.push(
      bloco.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k: string) => {
        const v = valores[k];
        if (!v) {
          faltando.add(k);
          return `[falta: ${k}]`;
        }
        return v.replace(/\n+/g, " ");
      }),
    );
  }
  return { texto: saida.join("\n\n"), faltando: [...faltando] };
}

/** Campos que o modelo usa (inclusive os citados dentro dos textos livres). */
export function camposUsados(modelo: string): Set<string> {
  return new Set([...modelo.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]));
}

/** Rótulo de cada campo do formulário, para as mensagens de pendência. */
export const ROTULOS: Record<string, string> = {
  servico: "Nome do serviço",
  servico_maiusculo: "Nome do serviço",
  preambulo: "Considerandos",
  objeto: "Objeto",
  escopo: "Escopo",
  duracao: "Duração / vigência",
  data_inicio: "Data de início",
  data_inicio_extenso: "Data de início",
  data_termino: "Data de término",
  data_termino_extenso: "Data de término",
  dedicacao: "Dedicação",
  honorarios: "Honorários",
  condicoes_especiais: "Condições específicas",
  forma_pagamento: "Forma de pagamento",
  indice_correcao: "Índice de correção",
  contratante_representante: "Representante do contratante",
  cidade: "Cidade da assinatura",
  data_extenso: "Data da assinatura",
  foro: "Foro",
  contratada_qualificacao: "Dados da contratada (em Contratos › Dados da contratada)",
  contratada_nome: "Nome da contratada (em Contratos › Dados da contratada)",
  contratada_documento: "CNPJ da contratada (em Contratos › Dados da contratada)",
};

/** Campos que podem ficar vazios: o parágrafo deles some. */
const OPCIONAIS = new Set(["preambulo", "condicoes_especiais"]);

/**
 * O que falta para gerar o PDF com este modelo (o rascunho pode ser salvo
 * incompleto). Só cobra os campos que o modelo realmente usa.
 */
export function pendenciasParaGerar(d: ContractData, s: ProviderSettings, modelo: string): string[] {
  const p: string[] = [];
  const usados = camposUsados(modelo);
  for (const k of TEXTOS_LIVRES) {
    for (const m of d[k].matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) usados.add(m[1]);
  }
  if (d.tipo === "pf") {
    if (!d.pf_nome) p.push("Nome do contratante");
    if (!d.pf_cpf) p.push("CPF do contratante");
  } else {
    if (!d.pj_razao) p.push("Razão social do contratante");
    if (!d.pj_cnpj) p.push("CNPJ do contratante");
  }
  if (!d.endereco) p.push("Endereço do contratante");
  if (usados.has("contratante_representante") && d.tipo === "pj" && !d.rep_nome) p.push("Representante legal do contratante");

  const valores = valoresBase(d, s);
  const ja = new Set(p);
  for (const k of usados) {
    if (OPCIONAIS.has(k) || k === "assinaturas" || k === "contratante_representante") continue;
    if (k === "valor_total" || k === "valor_total_extenso" || k === "parcelas") continue;
    if (valores[k] === undefined || valores[k] === "") {
      const r = ROTULOS[k] ?? k;
      if (!ja.has(r)) { p.push(r); ja.add(r); }
    }
  }

  if (usados.has("valor_total") || usados.has("valor_total_extenso") || usados.has("parcelas")) {
    const total = lerReais(d.valor_total);
    if (total === null || total <= 0) p.push("Valor total");
    if (usados.has("parcelas")) {
      const lidas = lerParcelas(d.parcelas);
      if ("erro" in lidas) p.push(lidas.erro);
      else if (!lidas.parcelas.length) p.push("Parcelas (use o botão Calcular parcelas)");
      else if (total !== null) {
        const soma = Math.round(lidas.parcelas.reduce((a, x) => a + x.valor, 0) * 100) / 100;
        if (Math.abs(soma - total) > 0.001) p.push(`A soma das parcelas (${formatarReais(soma)}) é diferente do valor total (${formatarReais(total)})`);
      }
    }
  }

  // Trechos sugeridos pelo modelo que ainda pedem preenchimento.
  const marcados = Object.entries(d)
    .filter(([, v]) => typeof v === "string" && /\[PREENCHER/i.test(v))
    .map(([k]) => ROTULOS[k] ?? k);
  if (marcados.length) p.push(`Complete os trechos marcados [PREENCHER] em: ${[...new Set(marcados)].join(", ")}`);
  return p;
}

/** Valores sugeridos que um modelo pode trazer para o contrato novo. */
export const CAMPOS_SUGERIDOS = [
  "servico", "duracao", "preambulo", "objeto", "escopo", "dedicacao", "honorarios", "condicoes_especiais", "forma_pagamento",
  "indice_correcao", "multa_atraso", "juros_mes", "multa_rescisoria", "prazo_cura", "aviso_previo", "sigilo_anos", "testemunhas",
] as const;
export type TemplateDefaults = Partial<Pick<ContractData, (typeof CAMPOS_SUGERIDOS)[number]>>;

/** Junta os padrões gerais com os sugeridos pelo modelo. */
export function aplicarSugestoes(base: ContractData, sugestoes: unknown): ContractData {
  if (!sugestoes || typeof sugestoes !== "object") return base;
  const src = sugestoes as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base };
  for (const k of CAMPOS_SUGERIDOS) {
    if (src[k] !== undefined && src[k] !== null && src[k] !== "") merged[k] = src[k];
  }
  return contractDataSchema.parse(merged);
}
