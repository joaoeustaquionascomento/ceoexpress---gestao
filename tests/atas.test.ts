import { describe, expect, it } from "vitest";
import { blankMinutes, minutesText, normalizeMinutes } from "@/lib/atas/conteudo";
import { maskPersonalData } from "@/lib/atas/privacidade";
import {
  deadlineFrom,
  docxXmlToText,
  minutesFromDocument,
  minutesFromTranscript,
  parseTaskLine,
  parseTranscript,
  speakersOf,
} from "@/lib/atas/transcricao";

const meeting = { scheduled_on: "2026-11-23", agenda: "Orçamento 2027\nContratações" }; // segunda-feira

describe("LGPD: mascaramento", () => {
  it("mascara CPF, e-mail, telefone e cartão, mas não CNPJ nem datas", () => {
    const t = maskPersonalData(
      "CPF 123.456.789-09 ou 12345678909, e-mail ana@empresa.com.br, fone (31) 99876-5432, cartão 4111 1111 1111 1111. CNPJ 12.345.678/0001-90 em 15/12/2026.",
    );
    expect(t).not.toMatch(/123\.456|12345678909|ana@|99876|4111/);
    expect(t).toContain("[CPF]");
    expect(t).toContain("[E-MAIL]");
    expect(t).toContain("[TELEFONE]");
    expect(t).toContain("12.345.678/0001-90");
    expect(t).toContain("15/12/2026");
  });
});

describe("leitura de transcrições", () => {
  it("Zoom (.vtt com 'Nome: fala')", () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Ana Souza: Bom dia a todos.

2
00:00:05.000 --> 00:00:09.000
Carlos Lima: Bom dia. Vamos começar.

3
00:00:10.000 --> 00:00:12.000
Carlos Lima: Primeiro o orçamento.`;
    const s = parseTranscript(vtt);
    expect(s).toEqual([
      { speaker: "Ana Souza", text: "Bom dia a todos." },
      { speaker: "Carlos Lima", text: "Bom dia. Vamos começar. Primeiro o orçamento." },
    ]);
  });

  it("Teams (.vtt com <v Nome>)", () => {
    const vtt = `WEBVTT

a1b2/12-0
00:00:01.000 --> 00:00:03.000
<v Beatriz Rocha>Olá, pessoal.</v>`;
    expect(parseTranscript(vtt)).toEqual([{ speaker: "Beatriz Rocha", text: "Olá, pessoal." }]);
  });

  it("Teams (Word: nome e horário numa linha, fala na seguinte)", () => {
    const txt = `Ana Souza   0:03
Vamos aprovar o orçamento.
Carlos Lima   0:15
Concordo.`;
    expect(speakersOf(parseTranscript(txt))).toEqual(["Ana Souza", "Carlos Lima"]);
  });

  it("Google Meet (horários soltos e 'Nome: fala')", () => {
    const txt = `00:00:00
Ana Souza: Começando.
00:01:10
Carlos: Certo.`;
    expect(speakersOf(parseTranscript(txt))).toEqual(["Ana Souza", "Carlos"]);
  });

  it("não confunde rótulos com nomes", () => {
    expect(parseTranscript("Pauta: orçamento")[0].speaker).toBeNull();
  });
});

describe("prazos ditos na reunião", () => {
  it("entende datas e expressões comuns", () => {
    expect(deadlineFrom("até 15/12", "2026-11-23")).toBe("2026-12-15");
    expect(deadlineFrom("até 10/01", "2026-11-23")).toBe("2027-01-10");
    expect(deadlineFrom("até sexta", "2026-11-23")).toBe("2026-11-27");
    expect(deadlineFrom("amanhã cedo", "2026-11-23")).toBe("2026-11-24");
    expect(deadlineFrom("semana que vem", "2026-11-23")).toBe("2026-11-30");
    expect(deadlineFrom("até o fim do mês", "2026-11-23")).toBe("2026-11-30");
    expect(deadlineFrom("quando der", "2026-11-23")).toBeNull();
    expect(deadlineFrom("até 31/02", "2026-11-23")).toBeNull();
  });
});

describe("rascunho da ata pela transcrição (sem IA)", () => {
  const transcript = `Ana Souza: Bom dia. Hoje vamos tratar do orçamento e das contratações.
Carlos Lima: Olhei os números. Ficou decidido que o orçamento de marketing será reduzido em 10%.
Ana Souza: Certo. Eu vou enviar a planilha revisada até sexta. Meu CPF é 123.456.789-09.
Carlos Lima: E a Beatriz fica responsável por levantar os currículos até 15/12.
Ana Souza: A contratação do gerente ficou pendente, a confirmar com a diretoria.`;

  const { content, stats } = minutesFromTranscript(transcript, meeting);

  it("pega participantes, decisões, tarefas e pendências", () => {
    expect(content.participantes).toEqual(["Ana Souza", "Carlos Lima"]);
    expect(stats.participantes).toBe(2);
    expect(content.decisoes.map((d) => d.texto)).toEqual(["Ficou decidido que o orçamento de marketing será reduzido em 10%."]);
    expect(content.encaminhamentos).toHaveLength(2);
    expect(content.encaminhamentos[0]).toMatchObject({ responsavel: "Ana Souza", prazo: "2026-11-27" });
    expect(content.encaminhamentos[1]).toMatchObject({ responsavel: "Beatriz", prazo: "2026-12-15" });
    expect(content.pendencias).toHaveLength(1);
  });

  it("já traz a pauta do encontro e não guarda CPF", () => {
    expect(content.pauta).toEqual(["Orçamento 2027", "Contratações"]);
    expect(content.assuntos.map((a) => a.titulo)).toEqual(["Orçamento 2027", "Contratações"]);
    expect(JSON.stringify(content)).not.toContain("123.456");
  });
});

describe("ata pronta trazida de fora", () => {
  it("lê Markdown com títulos, listas e tabela", () => {
    const md = `# Ata de reunião
Data: 23/11/2026

## Participantes
- Ana Souza (diretora)
- Carlos Lima

## Resumo
Reunião para revisar o orçamento.

## Pontos discutidos
### Orçamento
- Marketing acima do previsto.
### Contratações
Precisamos de um gerente.

## Decisões
1. Reduzir o marketing em 10%.

## Próximos passos
| Ação | Responsável | Prazo |
|---|---|---|
| Enviar planilha revisada | Ana Souza | 27/11/2026 |
| Levantar currículos | Beatriz | 15/12 |

## Pendências
- Aprovar a vaga com a diretoria`;
    const c = minutesFromDocument(md, meeting);
    expect(c.participantes).toEqual(["Ana Souza", "Carlos Lima"]);
    expect(c.resumo).toBe("Reunião para revisar o orçamento.");
    expect(c.assuntos).toEqual([
      { titulo: "Orçamento", texto: "- Marketing acima do previsto." },
      { titulo: "Contratações", texto: "Precisamos de um gerente." },
    ]);
    expect(c.decisoes.map((d) => d.texto)).toEqual(["Reduzir o marketing em 10%."]);
    expect(c.encaminhamentos).toEqual([
      { oque: "Enviar planilha revisada", responsavel: "Ana Souza", prazo: "2026-11-27", action_id: null },
      { oque: "Levantar currículos", responsavel: "Beatriz", prazo: "2026-12-15", action_id: null },
    ]);
    expect(c.pendencias).toEqual(["Aprovar a vaga com a diretoria"]);
    expect(c.pauta).toEqual(["Orçamento 2027", "Contratações"]);
  });

  it("separa o quê, quem e quando em linhas soltas", () => {
    expect(parseTaskLine("- Enviar proposta – Carlos Lima – 15/12", "2026-11-23")).toMatchObject({ oque: "Enviar proposta", responsavel: "Carlos Lima", prazo: "2026-12-15" });
    expect(parseTaskLine("Revisar contrato (Ana, 01/12/2026)", "2026-11-23")).toMatchObject({ oque: "Revisar contrato", responsavel: "Ana", prazo: "2026-12-01" });
    expect(parseTaskLine("Agendar visita. Responsável: Beatriz. Prazo: 05/12", "2026-11-23")).toMatchObject({ responsavel: "Beatriz", prazo: "2026-12-05" });
  });

  it("sem títulos reconhecidos, guarda tudo como um assunto", () => {
    const c = minutesFromDocument("Conversamos sobre vários temas.\nTudo certo.", meeting);
    expect(c.assuntos).toEqual([{ titulo: "Ata", texto: "Conversamos sobre vários temas.\nTudo certo." }]);
  });

  it("aceita 'Título: conteúdo' na mesma linha", () => {
    const c = minutesFromDocument("Participantes: Ana, Carlos e Beatriz\nDecisões: aprovar o orçamento", meeting);
    expect(c.participantes).toEqual(["Ana", "Carlos", "Beatriz"]);
    expect(c.decisoes[0].texto).toBe("aprovar o orçamento");
  });
});

describe("Word (.docx)", () => {
  it("converte parágrafos, listas, títulos e tabelas", () => {
    const xml = `<w:document><w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Decisões</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">Aprovar </w:t></w:r><w:r><w:t>o orçamento &amp; metas</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Ação</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Prazo</w:t></w:r></w:p></w:tc></w:tr>
<w:tr><w:tc><w:p><w:r><w:t>Enviar</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>15/12</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p/>
</w:body></w:document>`;
    expect(docxXmlToText(xml).split("\n").filter(Boolean)).toEqual([
      "## Decisões",
      "- Aprovar o orçamento & metas",
      "| Ação | Prazo |",
      "| Enviar | 15/12 |",
    ]);
  });
});

describe("conteúdo da ata", () => {
  it("normaliza e descarta itens vazios e ids inválidos", () => {
    const c = normalizeMinutes({
      participantes: ["Ana", "", 3],
      decisoes: [{ texto: "Aprovar", responsavel: "Ana", decision_id: "x" }, { texto: "" }],
      encaminhamentos: [{ oque: "Enviar", responsavel: "", prazo: "15/12", action_id: null }],
      extra: "ignorado",
    });
    expect(c.participantes).toEqual(["Ana"]);
    expect(c.decisoes).toEqual([{ texto: "Aprovar", responsavel: "Ana", decision_id: null }]);
    expect(c.encaminhamentos[0].prazo).toBeNull();
    expect(normalizeMinutes(null)).toEqual(normalizeMinutes({}));
  });

  it("monta o texto corrido usado na agenda", () => {
    const c = { ...blankMinutes("Orçamento"), participantes: ["Ana"], encaminhamentos: [{ oque: "Enviar", responsavel: "", prazo: "2026-12-15", action_id: null }] };
    expect(minutesText(c)).toBe("Participantes: Ana\n\nPauta:\n- Orçamento\n\nOrçamento:\n\nEncaminhamentos:\n- Enviar · responsável a definir · 15/12/2026");
  });
});
