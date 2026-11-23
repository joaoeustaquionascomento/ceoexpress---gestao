import type { Instrument } from "../tipos";

export const armadilhasDecisao: Instrument = {
  id: "armadilhas_decisao",
  version: 1,
  name: "Armadilhas de Decisão",
  summary: "Vieses que distorcem decisões de negócio e de carreira.",
  intro:
    "Todo mundo decide com atalhos mentais, e quase sempre eles ajudam. Às vezes, porém, eles levam a erros previsíveis. Esta avaliação mostra quais atalhos aparecem mais nas suas decisões, para que você possa se proteger deles.",
  instruction: "Pensando nas decisões dos últimos meses, com que frequência cada frase acontece com você?",
  scale: "freq",
  polarity: "risco",
  minutes: 6,
  dimensions: [
    {
      id: "adiar",
      label: "Adiar o importante",
      description: "Trocar o que é importante e trabalhoso pelo que é urgente ou agradável agora.",
      items: [
        { id: "ad01", text: "Deixo para depois decisões importantes que exigem pensar com calma." },
        { id: "ad02", text: "Preencho o dia com tarefas fáceis e sinto que fui produtivo, mas o principal não andou." },
        { id: "ad03", text: "Começo o dia pela tarefa mais importante, mesmo quando ela é a mais difícil.", reverse: true },
      ],
      high: "O importante está perdendo para o urgente. Quanto mais uma decisão é adiada, maior ela parece.",
      low: "Você enfrenta o importante sem adiar. Essa disciplina protege a estratégia da agenda do dia.",
      questions: [
        "Qual decisão importante está parada há mais tempo?",
        "O que você faz no lugar dela?",
      ],
      action: "Bloquear 60 minutos, nos primeiros horários de dois dias da semana, só para a decisão adiada.",
    },
    {
      id: "excesso_confianca",
      label: "Excesso de confiança",
      description: "Superestimar o próprio conhecimento, prazos e chances de sucesso.",
      items: [
        { id: "ad04", text: "Meus projetos levam mais tempo e custam mais do que eu tinha previsto." },
        { id: "ad05", text: "Tomo decisões importantes com base na minha experiência, sem checar números." },
        { id: "ad06", text: "Antes de decidir, penso no que poderia dar errado e no tamanho do prejuízo.", reverse: true },
      ],
      high: "Você tende a confiar mais na própria leitura do que nos dados. Experiência é valiosa, mas prazos e riscos costumam ser maiores do que parecem.",
      low: "Você equilibra confiança com checagem. Isso reduz surpresas desagradáveis.",
      questions: [
        "Qual foi a última previsão sua que errou por muito?",
        "Que número você poderia olhar antes da próxima decisão importante?",
      ],
      action: "Na próxima decisão relevante, escrever a previsão de prazo e custo e comparar depois com o que aconteceu.",
    },
    {
      id: "confirmacao",
      label: "Confirmar o que já acredito",
      description: "Buscar e valorizar só as informações que confirmam a opinião que já se tem.",
      items: [
        { id: "ad07", text: "Quando já tenho uma opinião, procuro argumentos que a confirmem." },
        { id: "ad08", text: "Opiniões contrárias às minhas me irritam mais do que me interessam." },
        { id: "ad09", text: "Peço a alguém que discorde de mim antes de fechar uma decisão importante.", reverse: true },
      ],
      high: "Você tende a buscar o que confirma o que já pensa. Isso dá segurança, mas esconde sinais importantes.",
      low: "Você busca opiniões contrárias e as considera. Isso melhora muito a qualidade das decisões.",
      questions: [
        "Que informação você evitou olhar numa decisão recente?",
        "Quem poderia fazer o papel de \"advogado do diabo\" nas suas decisões?",
      ],
      action: "Antes da próxima decisão importante, listar três razões pelas quais ela pode estar errada.",
    },
    {
      id: "medo_perder",
      label: "Medo de perder",
      description: "Dar mais peso ao risco de perder do que à chance de ganhar, e por isso não agir.",
      items: [
        { id: "ad10", text: "Deixo passar oportunidades boas por medo de perder o que já tenho." },
        { id: "ad11", text: "Uma perda pequena me incomoda muito mais do que um ganho do mesmo tamanho me alegra." },
        { id: "ad12", text: "Consigo assumir riscos calculados quando o ganho possível compensa.", reverse: true },
      ],
      high: "O medo de perder está pesando mais do que as oportunidades. Ficar parado também tem custo, só que ele aparece menos.",
      low: "Você pesa riscos e ganhos de forma equilibrada. Isso permite aproveitar oportunidades sem imprudência.",
      questions: [
        "Que oportunidade você deixou passar no último ano?",
        "Qual seria o pior cenário real, e ele seria recuperável?",
      ],
      action: "Para uma oportunidade em análise, escrever o pior cenário, o mais provável e o melhor, com valores.",
    },
    {
      id: "custo_afundado",
      label: "Insistir no que já custou caro",
      description: "Continuar investindo em algo só porque já se investiu muito nele.",
      items: [
        { id: "ad13", text: "Continuo apostando em projetos ou pessoas só porque já investi muito neles." },
        { id: "ad14", text: "Tenho dificuldade de encerrar algo que não está dando resultado." },
        { id: "ad15", text: "Decido o futuro de um projeto pelo que ele pode render daqui para frente, não pelo que já gastei.", reverse: true },
      ],
      high: "O que já foi investido está pesando nas decisões sobre o futuro. Às vezes, parar é a melhor decisão de investimento.",
      low: "Você decide olhando para frente, não para o que já gastou. Isso libera recursos para o que funciona.",
      questions: [
        "Se você começasse hoje, investiria de novo naquele projeto?",
        "Qual seria o critério para encerrar algo que não está funcionando?",
      ],
      action: "Revisar os projetos em andamento e definir, para cada um, um critério objetivo de continuar ou parar.",
    },
    {
      id: "manada",
      label: "Seguir a maioria",
      description: "Decidir pelo que os outros fazem ou pensam, em vez de pela própria análise.",
      items: [
        { id: "ad16", text: "Adoto uma ideia porque muita gente do meu mercado está fazendo." },
        { id: "ad17", text: "Mudo de opinião em reunião quando percebo que a maioria pensa diferente." },
        { id: "ad18", text: "Sustento uma posição bem fundamentada mesmo quando sou minoria.", reverse: true },
      ],
      high: "A opinião da maioria está influenciando muito suas escolhas. O que funciona para os outros nem sempre serve para o seu caso.",
      low: "Você forma a própria opinião e a sustenta. Isso é essencial em decisões estratégicas.",
      questions: [
        "Que decisão recente você tomou porque \"todo mundo está fazendo\"?",
        "O que, no seu negócio, é diferente da média do mercado?",
      ],
      action: "Na próxima decisão de grupo, registrar sua posição por escrito antes de ouvir os demais.",
    },
    {
      id: "emocao",
      label: "Decidir sob emoção",
      description: "Tomar decisões importantes no calor do momento.",
      items: [
        { id: "ad19", text: "Tomo decisões importantes quando estou irritado, ansioso ou muito empolgado." },
        { id: "ad20", text: "Depois, me arrependo de decisões tomadas no impulso." },
        { id: "ad21", text: "Quando estou com emoção forte, espero passar antes de decidir.", reverse: true },
      ],
      high: "Emoções fortes estão entrando nas decisões. Uma regra simples de espera evita boa parte dos arrependimentos.",
      low: "Você separa emoção e decisão. Isso dá consistência à sua liderança.",
      questions: [
        "Qual decisão tomada no impulso você mudaria hoje?",
        "Que sinais mostram que você não está em condição de decidir agora?",
      ],
      action: "Adotar a regra de esperar 24 horas antes de qualquer decisão importante tomada sob emoção forte.",
    },
  ],
};
