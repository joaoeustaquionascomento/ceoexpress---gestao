import type { Instrument } from "../tipos";

export const ieLideranca: Instrument = {
  id: "ie_lideranca",
  version: 1,
  name: "Inteligência Emocional na Liderança",
  summary: "Como você percebe e conduz emoções, as suas e as da equipe.",
  intro:
    "Esta avaliação olha para o modo como você lida com emoções no dia a dia de trabalho: as suas e as das pessoas ao redor. Responda pensando no que você costuma fazer, e não no que acha que deveria fazer.",
  instruction: "Com que frequência cada frase acontece com você?",
  scale: "freq",
  polarity: "competencia",
  minutes: 6,
  dimensions: [
    {
      id: "autoconsciencia",
      label: "Autoconsciência",
      description: "Perceber e nomear as próprias emoções e o efeito delas no comportamento.",
      items: [
        { id: "ie01", text: "Consigo nomear o que estou sentindo antes de reagir em uma conversa difícil." },
        { id: "ie02", text: "Percebo quando meu humor está afetando a forma como trato as pessoas." },
        { id: "ie03", text: "Só percebo que estava irritado ou ansioso depois que a situação já passou.", reverse: true },
        { id: "ie04", text: "Sei quais situações costumam me tirar do sério." },
      ],
      high: "Você percebe o que sente enquanto acontece. Essa leitura rápida é a base para escolher a reação, em vez de apenas reagir.",
      low: "As emoções parecem ser percebidas tarde, depois que já influenciaram a conversa ou a decisão.",
      questions: [
        "Qual situação recente você gostaria de ter percebido mais cedo o que estava sentindo?",
        "Quais sinais no corpo avisam que você está ficando tenso?",
      ],
      action: "Ao fim de cada dia, por duas semanas, anotar a emoção mais forte do dia e o que a disparou.",
    },
    {
      id: "autogestao",
      label: "Autogestão",
      description: "Conduzir as próprias reações sob pressão, frustração ou contrariedade.",
      items: [
        { id: "ie05", text: "Quando sou contrariado em reunião, levanto a voz ou encerro o assunto.", reverse: true },
        { id: "ie06", text: "Consigo fazer uma pausa antes de responder quando estou irritado." },
        { id: "ie07", text: "Mantenho a calma quando um problema grave aparece de surpresa." },
        { id: "ie08", text: "Depois de um dia ruim, consigo me recompor sem descontar em ninguém." },
      ],
      high: "Você costuma conduzir bem as próprias reações, mesmo sob pressão. A equipe tende a sentir segurança com isso.",
      low: "Sob pressão, as reações parecem sair antes da escolha. Isso pode gerar desgaste com a equipe, mesmo quando a intenção é boa.",
      questions: [
        "Qual reação sua você gostaria de ter feito diferente nas últimas semanas?",
        "O que te ajuda a ganhar alguns segundos antes de responder?",
      ],
      action: "Combinar consigo uma regra de pausa (por exemplo, esperar 10 minutos antes de responder mensagens que irritam) e testar por duas semanas.",
    },
    {
      id: "automotivacao",
      label: "Automotivação",
      description: "Manter energia e direção sem depender de cobrança externa.",
      items: [
        { id: "ie09", text: "Retomo um projeto travado mesmo quando ninguém está cobrando." },
        { id: "ie10", text: "Diante de um resultado ruim, perco o ânimo por vários dias.", reverse: true },
        { id: "ie11", text: "Sei por que faço o que faço, e isso me dá energia nas fases difíceis." },
        { id: "ie12", text: "Estabeleço desafios para mim mesmo, além do que me pedem." },
      ],
      high: "Você mantém o motor ligado sozinho. Esse impulso interno costuma contagiar a equipe.",
      low: "A energia parece depender muito de fatores externos, como cobrança ou bons resultados. Vale reconectar com o porquê do trabalho.",
      questions: [
        "O que mais te dá energia no trabalho hoje?",
        "Que projeto está parado esperando um empurrão seu?",
      ],
      action: "Escolher um projeto travado e definir o próximo passo de 30 minutos, com data marcada.",
    },
    {
      id: "empatia",
      label: "Empatia",
      description: "Compreender o ponto de vista e o estado emocional dos outros.",
      items: [
        { id: "ie13", text: "Antes de dar uma orientação, pergunto como a pessoa está vendo a situação." },
        { id: "ie14", text: "Percebo quando alguém da equipe está desmotivado, mesmo que a pessoa não diga." },
        { id: "ie15", text: "Interrompo as pessoas porque já sei o que elas vão dizer.", reverse: true },
        { id: "ie16", text: "Consigo entender a posição de quem discorda de mim, mesmo sem concordar." },
      ],
      high: "Você lê bem as pessoas e considera o ponto de vista delas. Isso facilita conversas difíceis e aumenta a confiança da equipe.",
      low: "O ponto de vista dos outros parece entrar pouco nas suas conversas. As pessoas podem estar se sentindo pouco ouvidas.",
      questions: [
        "Quem da equipe você conhece menos do que deveria?",
        "Em que conversa recente você poderia ter perguntado mais antes de falar?",
      ],
      action: "Na próxima semana, abrir cada conversa individual com uma pergunta sobre como a pessoa está vendo o trabalho, e só depois orientar.",
    },
    {
      id: "relacionamentos",
      label: "Gestão de relacionamentos",
      description: "Construir confiança, dar retorno e conduzir conflitos de forma produtiva.",
      items: [
        { id: "ie17", text: "Dou retorno sobre o trabalho da equipe com exemplos concretos, não só \"bom\" ou \"ruim\"." },
        { id: "ie18", text: "Evito conversas difíceis até que o problema fique grande demais.", reverse: true },
        { id: "ie19", text: "Reconheço publicamente as boas entregas das pessoas." },
        { id: "ie20", text: "Consigo resolver um conflito sem que a relação saia estremecida." },
      ],
      high: "Você constrói relações de confiança e encara conversas difíceis. É uma das competências mais visíveis de um líder.",
      low: "Conversas difíceis e retornos parecem ficar para depois. Problemas pequenos tendem a crescer quando não são tratados cedo.",
      questions: [
        "Que conversa difícil você está adiando hoje?",
        "Quando foi a última vez que você deu um retorno específico a alguém da equipe?",
      ],
      action: "Ter, nos próximos 7 dias, a conversa difícil que vem sendo adiada, preparada antes com o mentor.",
    },
  ],
};
