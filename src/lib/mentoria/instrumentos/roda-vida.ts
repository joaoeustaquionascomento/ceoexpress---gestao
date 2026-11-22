import type { Instrument } from "../tipos";

export const rodaVida: Instrument = {
  id: "roda_vida",
  version: 1,
  name: "Roda da Vida",
  summary: "Satisfação atual e desejada em 12 áreas da vida.",
  intro:
    "Esta avaliação mostra como você está hoje em 12 áreas da vida e onde quer chegar nos próximos 90 dias. Não existe resposta certa: quanto mais sincera a nota, mais útil fica a conversa com seu mentor.",
  instruction: "Dê uma nota de 0 a 10 para o quanto cada frase descreve a sua vida hoje. Depois, diga onde quer estar em 90 dias.",
  scale: "nota",
  polarity: "competencia",
  asksDesired: true,
  minutes: 8,
  dimensions: [
    {
      id: "saude",
      label: "Saúde e energia",
      description: "Cuidado com o corpo, sono, alimentação e disposição para o dia.",
      items: [
        { id: "rv01", text: "Durmo, me alimento e me movimento de um jeito que me deixa com energia para o dia." },
        { id: "rv02", text: "Cuido da minha saúde de forma preventiva, sem esperar um problema aparecer." },
      ],
      high: "Você sente que corpo e energia estão a seu favor. Vale proteger essa rotina nos períodos de mais pressão, que é quando ela costuma ser a primeira a ser sacrificada.",
      low: "A energia física parece estar abaixo do que você precisa. Sem ela, todas as outras áreas ficam mais pesadas, inclusive o trabalho.",
      questions: [
        "O que, na sua rotina atual, mais rouba sua energia?",
        "Qual pequeno hábito de saúde você conseguiria manter mesmo numa semana difícil?",
      ],
      action: "Escolher um único hábito de saúde (sono, caminhada ou alimentação) e registrar por 14 dias se ele foi cumprido.",
    },
    {
      id: "emocional",
      label: "Equilíbrio emocional",
      description: "Capacidade de lidar com pressão, frustração e ansiedade sem perder o eixo.",
      items: [
        { id: "rv03", text: "Consigo atravessar dias difíceis sem que as emoções tomem conta das minhas decisões." },
        { id: "rv04", text: "Tenho momentos de calma e descanso mental ao longo da semana." },
      ],
      high: "Você relata boa estabilidade emocional. Essa base costuma ser o que permite tomar decisões difíceis com clareza.",
      low: "As emoções parecem estar ocupando muito espaço. Vale entender o que dispara essa tensão antes de buscar mais produtividade.",
      questions: [
        "Em que situações da última semana você sentiu que perdeu o eixo?",
        "O que costuma devolver sua calma quando a pressão aumenta?",
      ],
      action: "Reservar 10 minutos por dia, no mesmo horário, para uma pausa sem tela e anotar como estava o humor antes e depois.",
    },
    {
      id: "intelectual",
      label: "Desenvolvimento intelectual",
      description: "Aprendizado contínuo, leitura e atualização.",
      items: [
        { id: "rv05", text: "Dedico tempo, toda semana, para aprender algo novo ou me atualizar." },
        { id: "rv06", text: "Sinto que estou mais preparado hoje do que estava há um ano." },
      ],
      high: "Você mantém o aprendizado em movimento. O próximo passo é transformar o que aprende em prática visível no trabalho.",
      low: "O aprendizado ficou em segundo plano. Sem ele, a tendência é repetir as mesmas soluções para problemas novos.",
      questions: [
        "Qual foi a última coisa que você aprendeu e colocou em prática?",
        "Que conhecimento faria mais diferença para você nos próximos 6 meses?",
      ],
      action: "Definir um tema de estudo e um horário fixo de 30 minutos por semana para ele, com uma anotação do que foi aplicado.",
    },
    {
      id: "carreira",
      label: "Carreira e propósito",
      description: "Sentido no trabalho e clareza sobre aonde se quer chegar.",
      items: [
        { id: "rv07", text: "O trabalho que faço tem sentido para mim e está ligado ao que considero importante." },
        { id: "rv08", text: "Tenho clareza sobre onde quero estar profissionalmente nos próximos anos." },
      ],
      high: "Você enxerga sentido no que faz e tem direção. Isso costuma sustentar a persistência nos momentos difíceis.",
      low: "Falta clareza ou sentido no trabalho hoje. Vale olhar com calma para o que você quer construir, antes de acelerar.",
      questions: [
        "Se nada mudasse nos próximos 3 anos, como você se sentiria?",
        "Que parte do seu trabalho mais combina com quem você é?",
      ],
      action: "Escrever em uma página onde quer estar em 3 anos e quais 3 escolhas de agora aproximam ou afastam desse ponto.",
    },
    {
      id: "financas",
      label: "Finanças",
      description: "Organização financeira, reservas e tranquilidade com dinheiro.",
      items: [
        { id: "rv09", text: "Sei quanto ganho, quanto gasto e para onde vai o meu dinheiro." },
        { id: "rv10", text: "Tenho uma reserva que me dá tranquilidade diante de imprevistos." },
      ],
      high: "Você tem as finanças sob controle. Isso libera energia para decisões de longo prazo, pessoais e da empresa.",
      low: "As finanças parecem ser uma fonte de preocupação. Organizar números pessoais costuma ser o primeiro passo para decisões mais calmas.",
      questions: [
        "Você separa claramente o dinheiro pessoal do dinheiro da empresa?",
        "Qual decisão financeira você vem adiando?",
      ],
      action: "Montar uma planilha simples de entradas e saídas do mês e revisar com o mentor na próxima sessão.",
    },
    {
      id: "contribuicao",
      label: "Contribuição social",
      description: "Impacto positivo na comunidade e nas pessoas ao redor.",
      items: [
        { id: "rv11", text: "Contribuo de alguma forma com pessoas ou causas além do meu círculo próximo." },
        { id: "rv12", text: "Sinto que o que faço deixa algo positivo para os outros." },
      ],
      high: "Você sente que contribui para além de si. Esse senso de impacto costuma fortalecer o propósito no trabalho.",
      low: "A contribuição para além do próprio círculo está pouco presente. Para muitas pessoas, ela é uma fonte importante de sentido.",
      questions: [
        "Que causa ou grupo de pessoas você gostaria de ajudar?",
        "O seu negócio já gera algum impacto que você poderia ampliar?",
      ],
      action: "Escolher uma forma concreta de contribuir no próximo mês (tempo, conhecimento ou recurso) e marcar a data.",
    },
    {
      id: "familia",
      label: "Família",
      description: "Qualidade da convivência e presença com a família.",
      items: [
        { id: "rv13", text: "Passo tempo de qualidade com a minha família, com atenção de verdade." },
        { id: "rv14", text: "A relação com a minha família me fortalece." },
      ],
      high: "A família aparece como uma base forte. Vale cuidar para que o trabalho não ocupe esse espaço nas fases de maior demanda.",
      low: "A convivência familiar parece estar abaixo do que você gostaria. Muitas vezes o problema é presença, não tempo.",
      questions: [
        "Quando foi a última vez que você esteve com a família sem pensar no trabalho?",
        "O que sua família diria que sente falta em você?",
      ],
      action: "Marcar na agenda dois momentos por semana com a família, tratados com a mesma prioridade de um compromisso de trabalho.",
    },
    {
      id: "amoroso",
      label: "Relacionamento amoroso",
      description: "Parceria, cumplicidade e cuidado na vida a dois.",
      items: [
        { id: "rv15", text: "Estou satisfeito com a minha vida amorosa como ela está hoje." },
        { id: "rv16", text: "Dedico atenção e cuidado a essa área, e não só o que sobra do meu tempo." },
      ],
      high: "Você está satisfeito com a vida amorosa. Esse apoio costuma pesar muito no equilíbrio geral.",
      low: "Essa área pede atenção. Vale entender se o que falta é tempo, conversa ou outra coisa.",
      questions: [
        "O que tornaria essa área mais próxima do que você deseja?",
        "Que conversa você vem adiando nessa parte da vida?",
      ],
      action: "Definir uma atitude concreta de cuidado nessa área para as próximas duas semanas.",
    },
    {
      id: "social",
      label: "Vida social",
      description: "Amizades, convivência e rede de apoio.",
      items: [
        { id: "rv17", text: "Tenho amigos com quem posso contar e encontro essas pessoas com alguma frequência." },
        { id: "rv18", text: "Minha vida social me dá prazer e não é só obrigação." },
      ],
      high: "Você tem uma rede de amizades ativa. Ela é um apoio importante nos momentos de pressão.",
      low: "A vida social está enfraquecida. O isolamento costuma aumentar o peso das preocupações do trabalho.",
      questions: [
        "Com quem você gostaria de estar mais perto e não tem estado?",
        "O que te impede de encontrar seus amigos com mais frequência?",
      ],
      action: "Retomar contato com duas pessoas importantes nas próximas duas semanas.",
    },
    {
      id: "lazer",
      label: "Lazer e diversão",
      description: "Tempo livre, descanso e atividades por prazer.",
      items: [
        { id: "rv19", text: "Tenho tempo livre para atividades que faço só por prazer." },
        { id: "rv20", text: "Consigo descansar de verdade, sem culpa." },
      ],
      high: "Você tem espaço para lazer e descanso. Essa recuperação costuma aparecer em criatividade e paciência no trabalho.",
      low: "O lazer quase não aparece na sua rotina. Sem pausa, o rendimento cai mesmo quando as horas aumentam.",
      questions: [
        "Qual atividade de lazer você deixou de fazer e sente falta?",
        "Que culpa aparece quando você para de trabalhar?",
      ],
      action: "Reservar um bloco de lazer na semana e protegê-lo como um compromisso.",
    },
    {
      id: "espiritualidade",
      label: "Espiritualidade",
      description: "Conexão com valores, fé ou com algo maior, do jeito de cada um.",
      items: [
        { id: "rv21", text: "Tenho práticas que me conectam com meus valores ou com algo maior do que eu." },
        { id: "rv22", text: "Essa conexão me ajuda a dar sentido ao que vivo." },
      ],
      high: "Você tem uma fonte de sentido bem cuidada. Ela costuma servir de âncora em fases de mudança.",
      low: "Essa área está pouco cuidada. Para algumas pessoas é fé; para outras, valores, natureza ou silêncio. Vale descobrir o que faz sentido para você.",
      questions: [
        "O que te ajuda a encontrar sentido nos momentos difíceis?",
        "Que prática te reconectava com seus valores e ficou para trás?",
      ],
      action: "Escolher uma prática de reflexão (oração, meditação, escrita ou caminhada) e fazê-la três vezes por semana.",
    },
    {
      id: "realizacao",
      label: "Realização e felicidade",
      description: "Satisfação geral com a vida e com o caminho percorrido.",
      items: [
        { id: "rv23", text: "Olhando para a minha vida como um todo, me sinto realizado." },
        { id: "rv24", text: "Sinto alegria no dia a dia, e não apenas quando alcanço grandes metas." },
      ],
      high: "Você se sente realizado e encontra alegria no cotidiano. É uma base forte para mudanças sem ansiedade.",
      low: "A sensação de realização está baixa. Vale olhar quais áreas mais puxam essa nota para baixo.",
      questions: [
        "O que precisaria acontecer para você se sentir mais realizado?",
        "Em que momentos recentes você se sentiu feliz de verdade?",
      ],
      action: "Anotar, toda noite durante duas semanas, um momento bom do dia, e revisar a lista na próxima sessão.",
    },
  ],
};
