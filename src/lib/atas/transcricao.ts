import { blankMinutes, emptyMinutes, splitList, type MinutesContent, type MinutesTask } from "./conteudo";
import { maskPersonalData } from "./privacidade";

/**
 * Leitura de transcrições e de atas prontas, sem IA (gratuito).
 * - Transcrição (Meet, Zoom, Teams, .vtt, .srt ou texto colado): limpa os
 *   horários, descobre quem falou e separa frases que parecem decisões e
 *   tarefas combinadas. O resultado é um rascunho para a consultoria conferir.
 * - Ata pronta (feita fora, em outra ferramenta): reconhece os títulos
 *   usuais (Participantes, Pauta, Decisões, Encaminhamentos…) e distribui o
 *   texto nos campos da ata.
 */

export type Speech = { speaker: string | null; text: string };

const TIMESTAMP_LINE = /^\s*(?:\[?\(?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\)?\]?)(?:\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?.*)?\s*$/;
const LEADING_TIMESTAMP = /^\s*\[?\(?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\)?\]?\s*[-–]?\s*/;
// Cabeçalho do Teams: "Nome Sobrenome   0:03" (ou "Nome Sobrenome 12:03:44")
const TEAMS_HEADER = /^(.{2,60}?)\s+\d{1,2}:\d{2}(?::\d{2})?\s*$/;

/** Parece nome de pessoa: até 5 palavras, sem números, começando por maiúscula. */
export function looksLikeName(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 60 || /\d|[?!.,;()[\]{}<>/\\@]/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 5) return false;
  if (!/^\p{Lu}/u.test(t)) return false;
  return !/^(obs|observação|pauta|data|local|hora|horário|assunto|nota|resumo|decisão|decisões|ação|ações|prazo|responsável|tema|item|pergunta|resposta|link|participantes)$/i.test(t);
}

/** Transforma o texto de qualquer formato comum em falas (quem falou e o quê). */
export function parseTranscript(raw: string): Speech[] {
  const out: Speech[] = [];
  let current: string | null = null;
  const push = (speaker: string | null, text: string) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.speaker === speaker) last.text += " " + t;
    else out.push({ speaker, text: t });
  };

  const lines = raw.replace(/\r\n?/g, "\n").replace(/^﻿/, "").split("\n");
  let inNote = false;
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i].trim();
    if (l && /-->/.test(lines[i + 1] ?? "") && !/-->/.test(l)) continue; // identificador do trecho (.vtt / .srt)
    if (!l) {
      inNote = false;
      continue;
    }
    if (/^WEBVTT/i.test(l) || /^(Kind|Language):/i.test(l)) continue;
    if (/^NOTE\b/.test(l)) {
      inNote = true;
      continue;
    }
    if (inNote) continue;
    if (/^\d{1,6}$/.test(l)) continue; // número do trecho (.srt / .vtt)
    if (TIMESTAMP_LINE.test(l)) continue;

    const teams = TEAMS_HEADER.exec(l);
    if (teams && looksLikeName(teams[1])) {
      current = teams[1].trim();
      continue;
    }
    l = l.replace(LEADING_TIMESTAMP, "");

    // Teams .vtt: <v Nome Sobrenome>fala</v>
    const v = /^<v(?:\.[^\s>]+)?\s+([^>]+)>(.*?)(?:<\/v>)?$/.exec(l);
    if (v) {
      current = v[1].trim();
      push(current, v[2].replace(/<[^>]+>/g, ""));
      continue;
    }
    l = l.replace(/<[^>]+>/g, "");

    // "Nome: fala"
    const colon = /^([^:]{2,60}):\s*(.*)$/.exec(l);
    if (colon && looksLikeName(colon[1])) {
      current = colon[1].trim();
      push(current, colon[2]);
      continue;
    }
    push(current, l);
  }
  return out;
}

export function speakersOf(speech: Speech[]): string[] {
  const seen = new Map<string, string>();
  for (const s of speech) {
    if (!s.speaker) continue;
    const k = s.speaker.toLocaleLowerCase("pt-BR");
    if (!seen.has(k)) seen.set(k, s.speaker);
  }
  return [...seen.values()];
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+(?=\p{Lu}|["“'])/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

const DECISION = /(?<![\p{L}\d])(?:fic(?:ou|a|amos)\s+(?:decidid[oa]|definid[oa]|combinad[oa]|acertad[oa]|aprovad[oa])|decidimos|definimos|aprovamos|acordamos|foi\s+(?:aprovad[oa]|decidid[oa]|definid[oa])|est[áa]\s+aprovad[oa]|batemos\s+o\s+martelo|fechamos\s+(?:que|com|em)|vamos\s+seguir\s+com|a\s+decis[ãa]o\s+[ée]|decidid[oa]\s+que)(?![\p{L}\d])/iu;
const TASK = /(?<![\p{L}\d])(?:vou|irei|fico\s+de|ficou\s+de|ficamos\s+de|fica\s+de|me\s+comprometo\s+a|fic(?:a|ou|ará)\s+respons[áa]vel\s+(?:por|pel[oa])|fic(?:a|ou)\s+com\s+a\s+tarefa\s+de)\s+(?:\p{L}+\s+)?\p{L}+(?:ar|er|ir|or)(?![\p{L}\d])/iu;
const OPEN = /(?<![\p{L}\d])(?:em\s+aberto|ficou\s+pendente|est[áa]\s+pendente|a\s+confirmar|sem\s+defini[çc][ãa]o|n[ãa]o\s+(?:decidimos|definimos|chegamos\s+a)|precisamos\s+(?:ver|avaliar)\s+(?:depois|melhor)|voltar\s+(?:a\s+)?(?:esse|este)\s+(?:assunto|ponto))(?![\p{L}\d])/iu;
const SELF = /(?<![\p{L}\d])(?:vou|irei|fico\s+de|me\s+comprometo|eu\s+fa[çc]o|deixa\s+comigo)(?![\p{L}\d])/iu;
const NAMED = /(\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+)?)\s+(?:fica|ficou|ficará|vai|irá|pode)\s+(?:respons[áa]vel|de|com|ver|enviar|mandar|fazer|preparar|levantar|verificar|organizar|agendar)/u;

const WEEKDAYS: Record<string, number> = { domingo: 0, segunda: 1, terça: 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6, sabado: 6 };

function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Prazo dito na frase ("até 15/12", "até sexta", "semana que vem"), a partir da data da reunião. */
export function deadlineFrom(text: string, meetingDate: string): string | null {
  const base = new Date(`${meetingDate}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const t = text.toLocaleLowerCase("pt-BR");

  const dm = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : base.getUTCFullYear();
      if (!dm[3] && (month < base.getUTCMonth() + 1 || (month === base.getUTCMonth() + 1 && day < base.getUTCDate()))) year++;
      const d = new Date(Date.UTC(year, month - 1, day, 12));
      if (d.getUTCMonth() === month - 1) return iso(d);
    }
  }
  const add = (n: number) => iso(new Date(base.getTime() + n * 86400000));
  if (/(?<!\p{L})amanh[ãa](?!\p{L})/u.test(t)) return add(1);
  if (/(?<!\p{L})(?:semana\s+que\s+vem|pr[óo]xima\s+semana)(?!\p{L})/u.test(t)) return add(7);
  if (/(?<!\p{L})(?:fim|final)\s+do\s+m[êe]s(?!\p{L})/u.test(t)) return iso(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12)));
  const wd = /(?<!\p{L})(?:at[ée]|na|nesta|essa|esta|pr[óo]xima)\s+(domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)(?!\p{L})/u.exec(t);
  if (wd) {
    const target = WEEKDAYS[wd[1]] ?? WEEKDAYS[wd[1].normalize("NFD").replace(/[̀-ͯ]/g, "")];
    if (target !== undefined) {
      let n = (target - base.getUTCDay() + 7) % 7;
      if (n === 0) n = 7;
      return add(n);
    }
  }
  return null;
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

/**
 * Rascunho de ata feito por regras a partir da transcrição: participantes,
 * frases com cara de decisão, tarefas combinadas (com quem falou e o prazo
 * quando dito) e pontos em aberto. O resumo fica para a consultoria escrever.
 */
export function minutesFromTranscript(
  raw: string,
  meeting: { scheduled_on: string; agenda: string | null },
): { content: MinutesContent; stats: { falas: number; participantes: number } } {
  const speech = parseTranscript(maskPersonalData(raw));
  const content: MinutesContent = { ...blankMinutes(meeting.agenda), participantes: speakersOf(speech) };
  const seen = new Set<string>();
  const once = (s: string) => {
    const k = s.toLocaleLowerCase("pt-BR").replace(/\W+/g, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  };

  for (const s of speech) {
    for (const f of sentences(s.text)) {
      if (DECISION.test(f) && content.decisoes.length < 30 && once(f)) {
        content.decisoes.push({ texto: clip(f, 2000), responsavel: "", decision_id: null });
      } else if (TASK.test(f) && content.encaminhamentos.length < 40 && once(f)) {
        const named = NAMED.exec(f)?.[1];
        const responsavel = named && looksLikeName(named) ? named : SELF.test(f) && s.speaker ? s.speaker : "";
        content.encaminhamentos.push({ oque: clip(f, 300), responsavel, prazo: deadlineFrom(f, meeting.scheduled_on), action_id: null });
      } else if (OPEN.test(f) && content.pendencias.length < 20 && once(f)) {
        content.pendencias.push(clip(f, 1000));
      }
    }
  }
  return { content, stats: { falas: speech.length, participantes: content.participantes.length } };
}

// ---------------------------------------------------------------------------
// Ata pronta, feita fora do sistema
// ---------------------------------------------------------------------------
type Section = "participantes" | "pauta" | "resumo" | "assuntos" | "decisoes" | "encaminhamentos" | "pendencias";

const HEADINGS: [RegExp, Section][] = [
  [/^(?:participantes|presentes|presen[çc]as?|participa[çc][ãa]o|lista\s+de\s+presen[çc]a)$/i, "participantes"],
  [/^(?:pauta|agenda|ordem\s+do\s+dia|t[óo]picos?)$/i, "pauta"],
  [/^(?:resumo(?:\s+executivo|\s+da\s+reuni[ãa]o)?|s[íi]ntese|objetivo(?:\s+da\s+reuni[ãa]o)?|contexto|vis[ãa]o\s+geral)$/i, "resumo"],
  [/^(?:assuntos?(?:\s+(?:tratados|discutidos|abordados))?|discuss[ãa]o|discuss[õo]es|pontos\s+(?:discutidos|abordados|tratados)|desenvolvimento|principais\s+pontos|t[óo]picos\s+discutidos)$/i, "assuntos"],
  [/^(?:decis[ãa]o|decis[õo]es(?:\s+tomadas)?|deliber[aã][çc][õo]es|o\s+que\s+foi\s+decidido|aprova[çc][õo]es)$/i, "decisoes"],
  [/^(?:encaminhamentos?|pr[óo]ximos\s+passos|a[çc][õo]es(?:\s+(?:definidas|combinadas))?|plano\s+de\s+a[çc][ãa]o|tarefas|action\s+items|respons[áa]veis\s+e\s+prazos)$/i, "encaminhamentos"],
  [/^(?:pend[êe]ncias|pontos\s+em\s+aberto|em\s+aberto|quest[õo]es\s+em\s+aberto|d[úu]vidas|riscos(?:\s+e\s+pend[êe]ncias)?)$/i, "pendencias"],
];

function headingOf(line: string): { section: Section; rest: string } | null {
  const m = /^(?:#{1,6}\s*)?(?:\*\*)?(?:\d{1,2}[.)]\s*)?([^:*]{3,60}?)(?:\*\*)?\s*(?::\s*(.*))?$/.exec(line.trim());
  if (!m) return null;
  const name = m[1].trim().replace(/\*+/g, "");
  for (const [re, section] of HEADINGS) if (re.test(name)) return { section, rest: (m[2] ?? "").replace(/\*\*/g, "").trim() };
  return null;
}

const BULLET = /^\s*(?:[-•*–▪◦]|\d{1,2}[.)]|\[\s?[xX ]?\s?\])\s+/;
const cleanMd = (s: string) => s.replace(/\*\*|__|`/g, "").replace(/^#+\s*/, "").trim();

function tableCells(line: string): string[] | null {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return null;
  const cells = t.slice(1, -1).split("|").map((c) => cleanMd(c));
  if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) return []; // linha separadora
  return cells;
}

const DATE_IN = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/;

function parseDate(s: string, meetingDate: string): string | null {
  const isoM = /\b(\d{4}-\d{2}-\d{2})\b/.exec(s);
  if (isoM) return isoM[1];
  return deadlineFrom(s, meetingDate);
}

/** Separa "o quê / responsável / prazo" de uma linha de encaminhamento. */
export function parseTaskLine(raw: string, meetingDate: string): MinutesTask {
  let text = cleanMd(raw.replace(BULLET, ""));
  let responsavel = "";
  let prazo: string | null = null;
  const resp = /(?<!\p{L})(?:respons[áa]vel|quem|dono)\s*:\s*([^;|–—\-().]+?)(?=\s*(?:[;|–—().]|\s-\s|prazo(?!\p{L})|$))/iu.exec(text);
  if (resp) {
    responsavel = resp[1].replace(/[.\s]+$/, "").trim();
    text = text.replace(resp[0], "");
  }
  const pz = /(?<!\p{L})(?:prazo|at[ée]|data|quando)\s*:?\s*([^;|–—()]+?)(?=\s*(?:[;|–—()]|\s-\s|$))/iu.exec(text);
  if (pz && (DATE_IN.test(pz[1]) || deadlineFrom(pz[0], meetingDate))) {
    prazo = parseDate(pz[0], meetingDate);
    text = text.replace(pz[0], "");
  }
  // "Fazer X – Fulano – 15/12" ou "Fazer X (Fulano, 15/12)"
  const parts = text.split(/\s+[–—-]\s+|\s*\|\s*|;\s*/).map((p) => p.replace(/[()]/g, "").trim()).filter(Boolean);
  if (parts.length > 1) {
    text = parts[0];
    for (const p of parts.slice(1)) {
      if (!prazo && DATE_IN.test(p)) prazo = parseDate(p, meetingDate);
      else if (!responsavel && looksLikeName(p.replace(/^respons[áa]vel\s*/i, ""))) responsavel = p;
    }
  }
  const paren = /\(([^)]+)\)\s*$/.exec(text);
  if (paren) {
    for (const p of paren[1].split(/,\s*/)) {
      if (!prazo && DATE_IN.test(p)) prazo = parseDate(p, meetingDate);
      else if (!responsavel && looksLikeName(p)) responsavel = p.trim();
    }
    text = text.slice(0, paren.index).trim();
  }
  return { oque: clip(text.replace(/[\s,;:–—-]+$/, "").trim(), 300), responsavel: clip(responsavel, 200), prazo, action_id: null };
}

/** Lê uma ata pronta (texto ou Markdown) e distribui nos campos. */
export function minutesFromDocument(raw: string, meeting: { scheduled_on: string; agenda: string | null }): MinutesContent {
  const c: MinutesContent = emptyMinutes();
  const lines = maskPersonalData(raw).replace(/\r\n?/g, "\n").split("\n");
  let section: Section | null = null;
  let found = false;
  const preamble: string[] = [];
  const resumo: string[] = [];
  let tableHeader: string[] | null = null;

  const addItem = (sec: Section, text: string, cells?: string[]) => {
    const t = cleanMd(text.replace(BULLET, ""));
    if (!t) return;
    switch (sec) {
      case "participantes":
        c.participantes.push(...t.split(/\s*[,;]\s*|\s+e\s+(?=\p{Lu})/u).map((p) => p.replace(/\s*[(–—-].*$/, "").trim()).filter(Boolean));
        break;
      case "pauta":
        c.pauta.push(...splitList(t));
        break;
      case "pendencias":
        c.pendencias.push(t);
        break;
      case "resumo":
        resumo.push(t);
        break;
      case "decisoes": {
        if (cells && cells.length > 1) {
          const resp = cells.slice(1).find((x) => looksLikeName(x)) ?? "";
          c.decisoes.push({ texto: clip(cells[0], 2000), responsavel: resp, decision_id: null });
        } else c.decisoes.push({ texto: clip(t, 2000), responsavel: "", decision_id: null });
        break;
      }
      case "encaminhamentos": {
        if (cells && cells.length > 1) {
          const h = (tableHeader ?? []).map((x) => x.toLocaleLowerCase("pt-BR"));
          const col = (re: RegExp) => h.findIndex((x) => re.test(x));
          const iResp = col(/respons|quem|dono/);
          const iPrazo = col(/prazo|data|quando/);
          const iWhat = col(/a[çc][ãa]o|o\s*qu[eê]|tarefa|encaminhamento|atividade|descri/);
          const what = cells[iWhat >= 0 ? iWhat : 0] ?? "";
          const resp = iResp >= 0 ? cells[iResp] : (cells.slice(1).find((x) => looksLikeName(x)) ?? "");
          const pz = iPrazo >= 0 ? cells[iPrazo] : (cells.slice(1).find((x) => DATE_IN.test(x)) ?? "");
          if (what) c.encaminhamentos.push({ oque: clip(what, 300), responsavel: clip(resp ?? "", 200), prazo: pz ? parseDate(pz, meeting.scheduled_on) : null, action_id: null });
        } else {
          const task = parseTaskLine(text, meeting.scheduled_on);
          if (task.oque) c.encaminhamentos.push(task);
        }
        break;
      }
      case "assuntos": {
        const isTitle = /^#{1,6}\s/.test(text.trim()) || /^\*\*[^*]+\*\*:?$/.test(text.trim()) || (/:$/.test(t) && t.length <= 120);
        if (isTitle || c.assuntos.length === 0) {
          if (isTitle) c.assuntos.push({ titulo: clip(t.replace(/:$/, ""), 200), texto: "" });
          else c.assuntos.push({ titulo: "Assuntos tratados", texto: t });
        } else {
          const last = c.assuntos[c.assuntos.length - 1];
          last.texto = (last.texto ? last.texto + "\n" : "") + (BULLET.test(text) ? `- ${t}` : t);
        }
        break;
      }
    }
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = tableCells(line);
    if (cells && cells.length === 0) continue; // separador de tabela
    const h = cells ? null : headingOf(line);
    if (h) {
      section = h.section;
      found = true;
      tableHeader = null;
      if (h.rest) addItem(section, h.rest);
      continue;
    }
    if (!section) {
      preamble.push(cleanMd(line));
      continue;
    }
    if (cells) {
      if (!tableHeader) {
        tableHeader = cells;
        if (cells.some((x) => /respons|prazo|a[çc][ãa]o|decis|tarefa|quem|data/i.test(x))) continue;
      }
      addItem(section, cells.join(" – "), cells);
      continue;
    }
    addItem(section, line);
  }

  const meta = /^(?:ata\b|data|local|hora|hor[áa]rio|in[íi]cio|t[ée]rmino|dura[çc][ãa]o|reuni[ãa]o|cliente|projeto|redigid[oa]|elaborad[oa])/i;
  const loose = preamble.filter((l) => l && !meta.test(l));
  if (!found) {
    // Sem títulos reconhecidos: tudo vira um assunto, para não perder nada.
    const all = lines.map((l) => cleanMd(l)).filter(Boolean).join("\n").trim();
    if (all) c.assuntos.push({ titulo: "Ata", texto: clip(all, 20000) });
  } else if (!resumo.length && loose.length) resumo.push(...loose);
  c.resumo = clip(resumo.join("\n\n"), 8000);
  if (!c.pauta.length) c.pauta = blankMinutes(meeting.agenda).pauta;
  c.participantes = [...new Set(c.participantes.map((p) => clip(p, 200)))];
  return c;
}

// ---------------------------------------------------------------------------
// Word (.docx): o texto do documento, parágrafo por parágrafo
// ---------------------------------------------------------------------------
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/**
 * Converte o word/document.xml em texto. Listas viram "- item" e linhas de
 * tabela viram "| a | b |", para a leitura da ata reconhecer.
 */
export function docxXmlToText(xml: string): string {
  const body = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tbl) => {
    const rows = tbl.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) ?? [];
    return rows
      .map((r) => {
        const cells = (r.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) ?? []).map((tc) =>
          paragraphs(tc).join(" ").replace(/\|/g, "/").trim(),
        );
        return `<w:p><w:r><w:t>| ${cells.join(" | ")} |</w:t></w:r></w:p>`;
      })
      .join("");
  });
  return paragraphs(body).join("\n");
}

function paragraphs(xml: string): string[] {
  const ps = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  return ps.map((p) => {
    const isList = /<w:numPr>/.test(p);
    const heading = /<w:pStyle w:val="(?:Heading|Ttulo|Titulo|Título)\d?"/i.test(p);
    let text = "";
    for (const m of p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
      text += m[1] !== undefined ? decodeXml(m[1]) : m[0] === "<w:tab/>" ? "\t" : "\n";
    }
    const t = text.trim();
    if (!t) return "";
    return isList ? `- ${t}` : heading ? `## ${t}` : t;
  });
}
