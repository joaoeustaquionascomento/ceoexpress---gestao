# Manual de administração (fases 0 a 4, modelos e ferramentas)

Este manual cobre o que já está disponível. Ele será ampliado a cada fase.

## Perfis de acesso

| Perfil | O que vê | O que faz |
| --- | --- | --- |
| Administrador CEOEXPRESS | Toda a carteira | Cadastra empresas, projetos e usuários; vê auditoria |
| Consultor | Só os projetos em que está alocado | Analisa documentos, atualiza planos (fase 2 e 3) |
| Gestor do cliente | Todos os pedidos do projeto liberados ao cliente | Envia documentos (fase 2) |
| Colaborador do cliente | Só os pedidos atribuídos a ele | Envia documentos dos seus pedidos (fase 2) |
| Leitor do cliente | O projeto liberado | Apenas consulta |

Notas internas e o registro de decisões marcados como internos nunca aparecem na Área do Cliente.

## Cadastrar um novo cliente

1. **Empresas > Nova empresa**: nome fantasia, razão social, CNPJ e segmento.
2. **Projetos > Novo projeto**: escolha a empresa, dê um nome e a data de início.
3. **Usuários e convites > Novo convite**: e-mail da pessoa, perfil e projeto.
4. Copie o link exibido e envie à pessoa. O link vale por **7 dias**, para **um único uso** e para
   **aquele e-mail**. A pessoa cria a própria senha ao abrir o link.

O envio automático do convite por e-mail entra na fase de notificações.

## Convidar um consultor

Gere o convite com o perfil **Consultor** e escolha o projeto em que ele vai atuar. O consultor vê apenas
os projetos em que estiver alocado.

## Esqueceu a senha

A própria pessoa usa **Esqueci minha senha** na tela de login. O link chega por e-mail, vale por 1 hora,
e a troca encerra todas as sessões abertas.

## Links antigos do portal

Links no formato `/convite?chave=...` do portal anterior não dão mais acesso. A tela orienta a pessoa a pedir
um novo convite.

## FIQ Brasil

A base inicial importada do portal original contém 16 pedidos de informação (D01 a D16) com 42 subitens e
suas orientações, 30 ações do plano ligadas às prioridades P1 a P3, a agenda de 5 encontros e 8 registros de
decisões, lacunas, hipóteses e premissas. A categoria de cada pedido foi atribuída pelo conteúdo, porque o
portal original não a registrava, e pode ser ajustada.

Os responsáveis aparecem por extenso (ex.: "Financeiro FIQ"). Depois que as pessoas aceitarem os convites,
cada pedido pode ser atribuído a um usuário na tela do pedido.

## Documentos (fase 2)

1. No projeto, abra um pedido com **Abrir pedido**.
2. O cliente envia o arquivo (até 25 MB, nos formatos aceitos pelo pedido). Enviar de novo cria uma nova
   versão; as anteriores ficam no histórico.
3. Enviar **não é validar**: o pedido fica como *Enviado* até a consultoria analisar.
4. A consultoria escolhe **Aprovar**, **Pedir complementação** (com mensagem obrigatória ao cliente) ou
   **Não aplicável**. O cliente recebe um aviso.
5. Mensagens marcadas como *nota interna* só aparecem para a consultoria.
6. Arquivos excluídos pelo cliente podem ser restaurados pela consultoria.
7. Os downloads usam links temporários (5 minutos); a pasta de arquivos não é pública.

O sino **Avisos**, no topo, mostra documentos recebidos, análises e novas mensagens. O envio desses avisos por
e-mail entra numa fase seguinte.

## Plano de ação (fase 3)

No projeto, clique em **Abrir plano: lista, Kanban e calendário**.

- **Lista**: todas as ações, com filtros por status, prioridade estratégica, "só as minhas" e "só atrasadas".
- **Kanban**: uma coluna por status. Em cada cartão, **Mover** muda o status.
- **Calendário**: prazos das ações, encontros e marcos do mês.

**Nova ação** (só a consultoria) pede as 7 perguntas: o que, por que, quem executa, quem decide, quais
informações são necessárias, quando deve ser concluído e como será comprovado. Também dá para marcar de quais
ações ela depende. O executor escolhido recebe um aviso.

Quem pode mudar o status:

| Perfil | Pode |
| --- | --- |
| Consultoria | Qualquer status, inclusive cancelar e reabrir |
| Gestor do cliente | Ações visíveis ao cliente, sem cancelar |
| Colaborador do cliente | Só as ações em que é o executor, sem cancelar |
| Leitor do cliente | Apenas consulta |

Uma ação só pode ser concluída depois das ações de que depende. Ao marcar **Bloqueada**, a observação é
obrigatória. Toda mudança de status fica no **Histórico** da ação, com autor, data e observação, e avisa a
outra parte. Ações e mensagens marcadas como internas não aparecem para o cliente.

**Trocar quem executa e o prazo sem abrir a ação**: na lista do plano, na coluna "Quem executa", clique em
**✎ Alterar quem executa e prazo**. Escolha uma pessoa com acesso ao projeto (ela recebe um aviso) ou escreva o
nome de quem ainda não tem acesso (ex.: "Equipe financeira"), ajuste a data e clique em **Salvar**.

**Códigos**: pedidos de informação usam PI-01, PI-02… e ações do plano AP-01, AP-02…. Ao criar um pedido ou
uma ação, deixe o código em branco e o sistema usa o próximo número livre.

## Agenda e decisões (fase 3)

Em **Agenda e decisões**, a consultoria agenda encontros, registra a ata e marca o encontro como realizado,
cadastra marcos (previsto e atingido) e mantém o registro de decisões, lacunas, hipóteses e premissas. Novos
registros de decisão nascem internos; desmarque "Interno" para compartilhar com o cliente.

## Painel, fila e auditoria (fase 4)

- **Carteira** (início do admin) e **Início** do consultor mostram o painel: documentos recebidos e aprovados,
  pedidos vencidos, ações concluídas, atrasadas e bloqueadas, por projeto, com filtros de cliente e projeto,
  e os encontros e marcos dos próximos 30 dias.
- **Fila de análise** lista os pedidos enviados pelo cliente, do mais antigo para o mais novo. Os parados há
  3 dias ou mais aparecem com o aviso "Há N dias".
- **Auditoria** (só admin) mostra quem criou, alterou ou excluiu cada registro, com filtros de empresa, tipo,
  ação e período. Clique em "Ver dados completos" para ver antes e depois.
- **Edição rápida**: na lista e no Kanban do plano, o botão "Alterar executor e prazo" muda só esses dois campos,
  sem abrir a ação.

## Exportar planilhas

Na página do projeto, **Baixar planilha (CSV)** gera os arquivos de pedidos, ações e decisões, que abrem direto
no Excel. Cada pessoa só recebe o que pode ver: o cliente não recebe itens internos. No plano de ação há também
o botão **Baixar CSV**.

## Resumo diário de avisos por e-mail

Todo dia às 8h (Brasília), quem tem avisos não lidos recebe um e-mail com a lista. Cada aviso vai uma vez só,
e clicar nele no e-mail marca como lido. Funciona depois de configurar `RESEND_API_KEY`, `EMAIL_FROM` e
`CRON_SECRET` na Vercel (ver `docs/IMPLANTACAO.md`). Sem elas, nada é enviado e o sino continua funcionando.

## Biblioteca de modelos, incluir e excluir pedidos e ações

- **Modelos** (menu do admin): pedidos de informação e ações prontos, com as orientações, escritos de forma genérica
  (sem nomes, pessoas ou datas de um cliente) para servir a qualquer projeto. O conteúdo-base fica em
  `data/modelos/biblioteca.json`. Use "Copiar de um projeto existente" para trazer para a biblioteca o que foi montado
  em outro projeto; códigos já existentes não são sobrescritos.
- **Novo projeto**: depois de clicar em "Criar projeto", abre a tela de modelos. Marque os pedidos e as ações e
  clique em "Criar". A mesma tela fica no projeto ("Adicionar dos modelos") e no plano ("Dos modelos"). Itens com
  o mesmo código já existentes no projeto não são duplicados.
- **Novo pedido**: na página do projeto, botão "Novo pedido". Para editar ou excluir, abra o pedido e clique em
  "Editar ou excluir pedido". Pedido com arquivo enviado não pode ser excluído: use "Não aplicável".
- **Excluir ação**: abra a ação e use "Excluir esta ação". Se outra ação depende dela, tire a dependência primeiro
  ou marque como "Cancelada", que mantém o registro.
- Toda exclusão fica registrada na Auditoria.

## Ferramentas de gestão

No projeto, botão **Ferramentas de gestão** (também no plano, em "Ferramentas"). A consultoria cria e preenche:

- **SWOT (FOFA):** forças, fraquezas, oportunidades e ameaças.
- **Matriz GUT:** problemas com notas de 1 a 5 para gravidade, urgência e tendência; a lista se ordena pela pontuação.
- **5 Porquês:** do problema à causa raiz e à contramedida.
- **Ishikawa (espinha de peixe):** causas possíveis em seis grupos.
- **Pareto:** categorias e valores; o gráfico mostra as "poucas vitais" que somam cerca de 80% do total.

Cada ferramenta tem o painel "Como usar", o campo de conclusões, o botão **Gerar ação** em cada item (a ação
entra no plano sem executor e sem prazo) e **Baixar planilha (CSV)**. Nascem internas; marque "Compartilhar com
o cliente" para ele ver (sem editar).

Além do diagnóstico (SWOT, GUT, 5 Porquês, Ishikawa e Pareto), há mais dois grupos:

- **Estratégia**:
  - **Modelo de negócio (Canvas)**, com nove blocos.
  - **Balanced Scorecard**, com objetivo, indicador e meta nas quatro perspectivas.
  - **OKR**, com objetivos e resultados-chave. Cada resultado tem valor de partida, meta e valor atual, e o progresso é calculado sozinho, inclusive quando a meta é reduzir um número.
- **Execução e ambiente**:
  - **Ciclo PDCA**.
  - **Matriz de Eisenhower**.
  - **PESTEL**, com nota de impacto por fator.
  - **5 Forças de Porter**, com nota de intensidade por força.

O botão **Gerar ação** aparece nas partes de cada ferramenta que fazem sentido virar ação:

| Ferramenta | O que pode virar ação |
| --- | --- |
| Balanced Scorecard | Objetivos |
| OKR | Resultados-chave ainda não atingidos |
| PESTEL | Itens dos fatores |
| 5 Forças de Porter | Itens das forças |
| Matriz de Eisenhower | Quadrantes "Fazer agora", "Agendar" e "Delegar" |
| Ciclo PDCA | Etapas "Planejar" e "Agir" |

O Canvas é descritivo e não gera ações. Todas as ferramentas têm análise automática e exportação em CSV.

## Relatórios automáticos

No projeto, clique em **Relatórios** e depois em **Gerar relatório**. O sistema lê as ferramentas, o plano de
ação, os pedidos de informação e as decisões e monta um rascunho com: resumo executivo, visão geral,
diagnóstico, prioridades, andamento do plano, riscos e próximos passos (30 dias). Na página de cada
ferramenta, **Gerar análise** faz o mesmo só para aquela ferramenta.

O rascunho é montado por regras fixas, a partir dos números e do texto cadastrado, sem custo. Ele nasce
**interno**. Para entregar ao cliente:

1. Abra o relatório e clique em **Revisar e editar**.
2. Ajuste o texto, acrescente o que só a consultoria sabe, remova ou reordene seções.
3. Marque **Revisei o conteúdo e está pronto** e, se quiser, **Compartilhar com o cliente**. O banco não
   deixa compartilhar um relatório que não foi marcado como revisado.
4. Clique em **Salvar**. Para PDF, use **Imprimir ou salvar em PDF** e escolha "Salvar como PDF".

A lista "Informações que faltam" aparece só para a consultoria.

**Uso de relatórios** (menu do administrador) mostra quantos relatórios foram gerados por mês, quantos foram
revisados e compartilhados. Serve para decidir quando vale ligar a análise com IA.

**Análise com IA (opcional, desligada)**: quando a chave `ANTHROPIC_API_KEY` for cadastrada na Vercel, aparece
o botão **Analisar com IA** ao lado de **Gerar relatório**. A IA escreve um texto mais elaborado a partir dos
mesmos dados (sem nomes de pessoas), com custo por uso, e o rascunho passa pela mesma revisão.
