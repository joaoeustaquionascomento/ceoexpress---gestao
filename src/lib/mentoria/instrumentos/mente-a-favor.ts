import type { Instrument } from "../tipos";

/**
 * Base conceitual: as distorções de pensamento descritas pela terapia
 * cognitiva (conhecimento público), traduzidas para a rotina de quem lidera.
 * Não usa nomes, perguntas nem textos de testes de terceiros.
 */
export const menteAFavor: Instrument = {
  id: "mente_a_favor",
  version: 1,
  name: "Mente a Favor",
  summary: "Quanto do seu tempo a mente trabalha a seu favor, e os padrões de pensamento que atrapalham.",
  intro:
    "Nossa mente às vezes ajuda e às vezes atrapalha. Esta avaliação tem duas partes: a primeira mostra quanto dos seus últimos dias foi vivido com a mente a seu favor; a segunda mostra quais padrões de pensamento mais aparecem quando ela atrapalha.",
  instruction: "Com que frequência cada frase acontece com você?",
  scale: "freq",
  polarity: "risco",
  minutes: 7,
  index: {
    label: "Índice Mente a Favor",
    instruction: "Pensando nos últimos 7 dias, com que frequência você esteve assim?",
    items: [
      { id: "mf01", text: "Calmo, mesmo com muita coisa acontecendo.", positive: true },
      { id: "mf02", text: "Remoendo algo que já passou e que não posso mudar.", positive: false },
      { id: "mf03", text: "Curioso para entender um problema, em vez de só querer culpados.", positive: true },
      { id: "mf04", text: "Me criticando com dureza por erros pequenos.", positive: false },
      { id: "mf05", text: "Concentrado no que dependia de mim.", positive: true },
      { id: "mf06", text: "Irritado com pessoas por coisas que não mereciam tanto.", positive: false },
      { id: "mf07", text: "Agindo com decisão, sem ficar travado por dúvidas.", positive: true },
      { id: "mf08", text: "Ansioso com coisas que talvez nem aconteçam.", positive: false },
      { id: "mf09", text: "Gentil comigo mesmo depois de um erro.", positive: true },
      { id: "mf10", text: "Adiando o que era importante por desconforto.", positive: false },
      { id: "mf11", text: "Criativo, com ideias novas para velhos problemas.", positive: true },
      { id: "mf12", text: "Querendo controlar tudo e todos ao meu redor.", positive: false },
    ],
  },
  dimensions: [
    {
      id: "catastrofizar",
      label: "Catastrofizar",
      description: "Imaginar o pior desfecho possível e reagir como se ele fosse certo.",
      items: [
        { id: "mf13", text: "Diante de um problema, logo imagino que tudo vai dar errado." },
        { id: "mf14", text: "Perco o sono pensando em consequências que provavelmente não vão acontecer." },
      ],
      high: "Sua mente costuma saltar para o pior cenário. Isso gasta energia com problemas que, na maioria das vezes, não chegam.",
      low: "Você avalia problemas sem saltar para o pior. Isso mantém a energia para resolver o que é real.",
      questions: [
        "Qual foi a última preocupação grande que não se confirmou?",
        "Qual é o cenário mais provável, e não o pior, para o que te preocupa hoje?",
      ],
      action: "Quando a preocupação aparecer, escrever três cenários (pior, mais provável e melhor) antes de agir.",
    },
    {
      id: "tudo_ou_nada",
      label: "Tudo ou nada",
      description: "Ver as coisas em extremos: perfeito ou fracasso, sem meio-termo.",
      items: [
        { id: "mf15", text: "Se algo não sai perfeito, sinto que foi um fracasso." },
        { id: "mf16", text: "Prefiro não começar a fazer algo pela metade." },
      ],
      high: "Você tende a enxergar em extremos. Isso pode travar o começo de projetos e tirar o mérito de avanços parciais.",
      low: "Você valoriza o progresso, não só a perfeição. Isso facilita começar e melhorar aos poucos.",
      questions: [
        "Que projeto está parado esperando condições perfeitas?",
        "Como seria uma versão \"boa o suficiente\" do que você quer fazer?",
      ],
      action: "Escolher uma entrega e definir antes o que é \"bom o suficiente\" para ela, e entregar nesse ponto.",
    },
    {
      id: "deveria",
      label: "Tirania do \"deveria\"",
      description: "Regras rígidas sobre como você e os outros deveriam ser, que geram culpa e irritação.",
      items: [
        { id: "mf17", text: "Penso muito em como as coisas deveriam ser, e me irrito quando não são." },
        { id: "mf18", text: "Me cobro com frases como \"eu já deveria ter resolvido isso\"." },
      ],
      high: "Regras internas rígidas estão gerando cobrança e frustração. Trocar \"deveria\" por \"gostaria\" costuma abrir espaço para agir.",
      low: "Você lida com expectativas de forma flexível. Isso reduz culpa e conflito.",
      questions: [
        "Que \"deveria\" mais pesa sobre você hoje?",
        "De onde vem essa regra, e ela ainda faz sentido?",
      ],
      action: "Durante uma semana, anotar cada \"eu deveria\" que aparecer e reescrever como \"eu escolho\" ou \"eu gostaria\".",
    },
    {
      id: "adivinhar",
      label: "Adivinhar o que o outro pensa",
      description: "Concluir o que os outros pensam ou sentem sem perguntar.",
      items: [
        { id: "mf19", text: "Tenho certeza do que as pessoas estão pensando de mim, mesmo sem elas dizerem." },
        { id: "mf20", text: "Interpreto um silêncio ou uma resposta curta como sinal de que algo está errado comigo." },
      ],
      high: "Você costuma tirar conclusões sobre o que os outros pensam sem confirmar. Muitas dessas conclusões não se sustentam numa conversa.",
      low: "Você confere antes de concluir. Isso evita conflitos que só existem na cabeça.",
      questions: [
        "Que conclusão sobre alguém você tirou sem perguntar?",
        "Como seria perguntar diretamente, sem acusar?",
      ],
      action: "Na próxima vez que suspeitar do que alguém pensa, fazer uma pergunta aberta antes de reagir.",
    },
    {
      id: "desconsiderar",
      label: "Desconsiderar o que deu certo",
      description: "Minimizar conquistas e dar peso só ao que falhou.",
      items: [
        { id: "mf21", text: "Quando algo dá certo, acho que foi sorte ou que não fiz mais que a obrigação." },
        { id: "mf22", text: "Num dia com várias coisas boas, fico pensando só na que deu errado." },
      ],
      high: "Suas conquistas estão sendo apagadas pelo que falhou. Isso desgasta a confiança e a motivação com o tempo.",
      low: "Você reconhece o que deu certo. Isso sustenta a energia para enfrentar o que falta.",
      questions: [
        "Qual conquista recente você não comemorou?",
        "O que você diria a alguém da equipe que fizesse o mesmo que você fez?",
      ],
      action: "Encerrar cada semana anotando três coisas que deram certo e qual foi a sua parte em cada uma.",
    },
    {
      id: "generalizar",
      label: "Generalizar",
      description: "Tirar conclusões amplas a partir de um único fato (\"sempre\", \"nunca\").",
      items: [
        { id: "mf23", text: "Depois de um erro, penso \"eu sempre faço isso\" ou \"nunca dá certo comigo\"." },
        { id: "mf24", text: "Um cliente ou funcionário ruim me faz desconfiar de todos." },
      ],
      high: "Um fato isolado costuma virar regra geral. Isso distorce decisões sobre pessoas e oportunidades.",
      low: "Você olha cada situação pelo que ela é. Isso permite decisões mais justas.",
      questions: [
        "Que \"sempre\" ou \"nunca\" você disse recentemente sobre você ou sobre alguém?",
        "Quantos casos reais sustentam essa regra?",
      ],
      action: "Ao perceber um \"sempre\" ou \"nunca\", procurar uma exceção concreta e anotá-la.",
    },
    {
      id: "personalizar",
      label: "Tomar tudo para si",
      description: "Assumir culpa por tudo o que dá errado, inclusive pelo que não depende de você.",
      items: [
        { id: "mf25", text: "Quando algo dá errado na equipe, sinto que a culpa é minha." },
        { id: "mf26", text: "Carrego problemas dos outros como se fossem responsabilidade minha." },
      ],
      high: "Você tende a carregar mais responsabilidade do que lhe cabe. Isso sobrecarrega e tira da equipe a chance de crescer.",
      low: "Você separa o que é seu do que é dos outros. Isso equilibra responsabilidade e autonomia da equipe.",
      questions: [
        "Que problema dos outros você está carregando hoje?",
        "O que, de fato, dependia de você na última coisa que deu errado?",
      ],
      action: "Para o próximo problema da equipe, separar por escrito o que dependia de você e o que dependia de outros.",
    },
    {
      id: "rotular",
      label: "Rotular",
      description: "Resumir pessoas, inclusive a si mesmo, em rótulos fixos.",
      items: [
        { id: "mf27", text: "Depois de um erro, penso coisas como \"sou incompetente\"." },
        { id: "mf28", text: "Classifico pessoas de forma definitiva, como \"preguiçoso\" ou \"enrolado\"." },
      ],
      high: "Rótulos fixos estão substituindo a observação de comportamentos. Rótulos não ensinam nada; comportamentos podem ser mudados.",
      low: "Você descreve comportamentos em vez de rotular pessoas. Isso facilita dar retorno e mudar.",
      questions: [
        "Que rótulo você usa sobre você mesmo nos dias ruins?",
        "Que comportamento específico está por trás de um rótulo que você usa sobre alguém?",
      ],
      action: "Trocar, por duas semanas, cada rótulo por uma descrição do comportamento observado.",
    },
  ],
};
