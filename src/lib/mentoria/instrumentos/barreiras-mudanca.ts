import type { Instrument } from "../tipos";

export const barreirasMudanca: Instrument = {
  id: "barreiras_mudanca",
  version: 1,
  name: "Barreiras à Mudança",
  summary: "O que trava você de mudar aquilo que você mesmo quer mudar.",
  intro:
    "Antes de começar, pense em uma mudança que você quer fazer na sua vida ou no seu trabalho. Todas as perguntas são sobre essa mudança. A avaliação mostra o que mais tem segurado você, para que a conversa com seu mentor vá direto ao ponto.",
  instruction: "Pensando na mudança que você escolheu, com que frequência cada frase acontece com você?",
  scale: "freq",
  polarity: "risco",
  minutes: 7,
  dimensions: [
    {
      id: "meta_vaga",
      label: "Meta pouco clara",
      description: "A mudança desejada ainda não está definida em termos concretos.",
      items: [
        { id: "bm01", text: "Sei que quero mudar, mas não consigo dizer exatamente o que vai ser diferente." },
        { id: "bm02", text: "A mudança parece tão grande que não sei por onde começar." },
        { id: "bm03", text: "Consigo descrever o primeiro passo da mudança e quando vou dá-lo.", reverse: true },
      ],
      high: "A mudança ainda está grande demais ou vaga demais. Sem um primeiro passo concreto, a tendência é adiar.",
      low: "Você sabe o que quer mudar e por onde começar. Isso já elimina uma das barreiras mais comuns.",
      questions: [
        "Como você vai saber, daqui a 90 dias, que a mudança aconteceu?",
        "Qual é o menor passo possível que você poderia dar nesta semana?",
      ],
      action: "Reescrever a mudança em uma frase com resultado e prazo, e definir o primeiro passo com data.",
    },
    {
      id: "prontidao",
      label: "Baixa prontidão",
      description: "A vontade de mudar ainda não é maior que o conforto da situação atual.",
      items: [
        { id: "bm04", text: "No fundo, a situação atual ainda é confortável o suficiente para eu não mudar." },
        { id: "bm05", text: "Espero o momento certo para começar, e ele não chega." },
        { id: "bm06", text: "Sinto que essa mudança é urgente para mim, e não só para os outros.", reverse: true },
      ],
      high: "A vontade de mudar ainda não superou o conforto do que já existe. Vale entender o custo de ficar como está.",
      low: "Você está pronto para mudar e sente a urgência como sua. É um bom momento para começar.",
      questions: [
        "O que você perde se nada mudar nos próximos 12 meses?",
        "Essa mudança é sua ou é algo que esperam de você?",
      ],
      action: "Listar, em duas colunas, o que você ganha mudando e o que perde ficando como está, e trazer para a sessão.",
    },
    {
      id: "habitos",
      label: "Hábitos que puxam para trás",
      description: "Rotinas automáticas que trabalham contra a mudança.",
      items: [
        { id: "bm07", text: "Começo bem, mas em poucos dias volto ao jeito antigo de fazer as coisas." },
        { id: "bm08", text: "Minha rotina é tão cheia de urgências que não sobra espaço para o novo." },
        { id: "bm09", text: "Já troquei pelo menos um hábito antigo por um novo ligado a essa mudança.", reverse: true },
      ],
      high: "Os hábitos atuais estão puxando você de volta. Mudança de comportamento depende mais de rotina do que de força de vontade.",
      low: "Seus hábitos não estão travando a mudança. Vale usar essa disciplina para consolidar o novo comportamento.",
      questions: [
        "Em que momento do dia você costuma voltar ao jeito antigo?",
        "Que gatilho do ambiente poderia lembrar você do novo hábito?",
      ],
      action: "Escolher um único hábito novo, ligá-lo a algo que você já faz todo dia e registrar por 21 dias.",
    },
    {
      id: "crencas",
      label: "Crenças limitantes",
      description: "Ideias sobre si mesmo que fazem a mudança parecer impossível ou indevida.",
      items: [
        { id: "bm10", text: "Penso que algumas pessoas nascem com jeito para isso, e eu não sou uma delas." },
        { id: "bm11", text: "Acho que, na minha idade ou na minha situação, já não dá para mudar tanto." },
        { id: "bm12", text: "Acredito que consigo aprender o que for preciso para essa mudança.", reverse: true },
      ],
      high: "Algumas crenças sobre você mesmo estão fazendo a mudança parecer impossível. Elas costumam ser mais antigas do que verdadeiras.",
      low: "Você acredita na sua capacidade de mudar. Essa confiança é uma das melhores previsões de sucesso.",
      questions: [
        "Que frase sobre você mesmo aparece quando pensa nessa mudança?",
        "Que evidência do seu passado contradiz essa frase?",
      ],
      action: "Anotar a crença que mais pesa e, ao lado, três situações em que você agiu diferente dela.",
    },
    {
      id: "ambiente",
      label: "Ambiente desfavorável",
      description: "Pessoas, estruturas ou rotinas ao redor que dificultam a mudança.",
      items: [
        { id: "bm13", text: "Pessoas próximas desestimulam ou não levam a sério a mudança que quero fazer." },
        { id: "bm14", text: "O ambiente onde passo a maior parte do tempo favorece o comportamento antigo." },
        { id: "bm15", text: "Tenho pessoas ao meu redor que apoiam ativamente essa mudança.", reverse: true },
      ],
      high: "O ambiente ao redor está jogando contra. Às vezes, mudar o ambiente é mais fácil do que contar só com a força de vontade.",
      low: "Seu ambiente apoia a mudança. Vale envolver essas pessoas no acompanhamento.",
      questions: [
        "Quem ao seu redor mais ajuda, e quem mais atrapalha, essa mudança?",
        "Que mudança no ambiente físico facilitaria o novo comportamento?",
      ],
      action: "Contar a mudança a uma pessoa de confiança e pedir que pergunte sobre o andamento a cada semana.",
    },
    {
      id: "isolamento",
      label: "Isolamento",
      description: "Dificuldade de pedir ajuda ou de dividir as dificuldades.",
      items: [
        { id: "bm16", text: "Prefiro resolver tudo sozinho a pedir ajuda." },
        { id: "bm17", text: "Sinto vergonha de admitir que estou com dificuldade." },
        { id: "bm18", text: "Converso abertamente sobre minhas dificuldades com alguém de confiança.", reverse: true },
      ],
      high: "Você tende a carregar a mudança sozinho. Pedir ajuda costuma encurtar muito o caminho.",
      low: "Você divide as dificuldades e pede ajuda quando precisa. Isso torna a mudança mais leve.",
      questions: [
        "O que você imagina que aconteceria se pedisse ajuda?",
        "Quem poderia ajudar você nessa mudança e ainda não sabe disso?",
      ],
      action: "Pedir ajuda a uma pessoa específica para um ponto concreto da mudança nas próximas duas semanas.",
    },
    {
      id: "saber_sem_fazer",
      label: "Saber sem fazer",
      description: "Distância entre o que você sabe que deve fazer e o que de fato faz.",
      items: [
        { id: "bm19", text: "Leio, estudo e planejo bastante, mas coloco pouco em prática." },
        { id: "bm20", text: "Sei exatamente o que deveria fazer e mesmo assim não faço." },
        { id: "bm21", text: "Transformo o que aprendo em alguma ação na mesma semana.", reverse: true },
      ],
      high: "Há uma distância entre saber e fazer. Mais conhecimento não resolve: o que falta é transformar o que você já sabe em compromisso com data.",
      low: "Você coloca em prática o que aprende. Essa é uma vantagem rara.",
      questions: [
        "O que você já sabe que precisa fazer e ainda não fez?",
        "O que acontece entre a decisão e a ação?",
      ],
      action: "Para cada aprendizado das próximas sessões, registrar uma ação com data no plano de ação.",
    },
    {
      id: "apego",
      label: "Apego ao que já foi",
      description: "Dificuldade de abrir mão de formas antigas de agir, de pessoas ou de projetos.",
      items: [
        { id: "bm22", text: "Tenho dificuldade de largar projetos, rotinas ou responsabilidades que já não fazem sentido." },
        { id: "bm23", text: "Penso muito em como as coisas eram antes e no tempo que já investi." },
        { id: "bm24", text: "Consigo encerrar um ciclo quando percebo que ele chegou ao fim.", reverse: true },
      ],
      high: "Algo do passado está ocupando o espaço do novo. Mudar quase sempre exige deixar alguma coisa para trás.",
      low: "Você sabe encerrar ciclos. Isso abre espaço para a mudança acontecer.",
      questions: [
        "Do que você precisaria abrir mão para essa mudança acontecer?",
        "O que você continua fazendo só porque sempre fez?",
      ],
      action: "Listar três coisas que você vai parar de fazer para abrir espaço para a mudança.",
    },
  ],
};
