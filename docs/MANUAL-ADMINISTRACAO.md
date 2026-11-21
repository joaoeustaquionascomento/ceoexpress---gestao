# Manual de administração (fases 0, 2 e 3)

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

## Agenda e decisões (fase 3)

Em **Agenda e decisões**, a consultoria agenda encontros, registra a ata e marca o encontro como realizado,
cadastra marcos (previsto e atingido) e mantém o registro de decisões, lacunas, hipóteses e premissas. Novos
registros de decisão nascem internos; desmarque "Interno" para compartilhar com o cliente.
