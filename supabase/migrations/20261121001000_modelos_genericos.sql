-- Gerado por scripts/gerar-modelos.mjs a partir de data/modelos/biblioteca.json. Não editar à mão.
-- Biblioteca de modelos genérica: sem nomes, pessoas, datas ou termos de um cliente específico.
-- Os pedidos e ações já criados nos projetos não mudam.

insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D01', 'Contrato de consultoria e documentos cadastrais', 'Institucional e contrato', '01_DOCUMENTOS_INSTITUCIONAIS', 'Contrato de consultoria assinado, anexos e dados cadastrais da empresa contratante.', 'Confirma escopo, vigência e dados da contratante, e evita divergências entre proposta e contrato.', 'Documento integral assinado, anexos identificados, data de início e CNPJ conferidos.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Contrato de consultoria assinado","instrucao":"Envie a via assinada completa, da primeira página até as assinaturas. Contrato social e alterações societárias são outro pedido."},{"item":"Anexos, aditivos e vigência","instrucao":"Junte a proposta e os anexos incorporados ao contrato e eventuais aditivos. Indique a data de início e o prazo de vigência."},{"item":"Comprovante de inscrição e situação cadastral do CNPJ","instrucao":"Anexe o comprovante atualizado da Receita Federal do CNPJ contratante. Confira razão social, número, situação e data de emissão."}]'::jsonb, 0, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D02', 'Saldos bancários e extratos', 'Financeiro', '02_FINANCEIRO', 'Saldo de cada conta na data de início do trabalho e extratos recentes.', 'Define o saldo inicial de caixa usado nas projeções.', 'Separar disponível, bloqueado, limite de crédito e pendências de conciliação.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Saldo por conta na data de referência","instrucao":"Informe o saldo de cada conta na data combinada com a consultoria. Identifique banco e conta por apelido ou final do número. Separe disponível, bloqueado e limite."},{"item":"Extratos recentes das contas","instrucao":"Anexe o extrato do banco de cada conta, com datas inicial e final, movimentações e saldos que permitam conferir a data de referência."},{"item":"Pendências de conciliação","instrucao":"Liste lançamentos sem correspondência entre banco e sistema financeiro, com conta, data, valor e o que falta conferir."}]'::jsonb, 1, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D03', 'Contas a pagar e obrigações vencidas', 'Financeiro', '02_FINANCEIRO', 'Obrigações das próximas 13 semanas e títulos em atraso.', 'Identifica compromissos e riscos imediatos de caixa.', 'Credor, documento, vencimento, valor em aberto, centro de custo ou projeto e criticidade.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Contas a vencer nas próximas 13 semanas","instrucao":"Exporte o relatório de contas a pagar das 13 semanas seguintes à data de referência, uma linha por título ou parcela."},{"item":"Obrigações vencidas com criticidade","instrucao":"Separe os títulos vencidos. Indique dias de atraso, previsão de pagamento e a consequência de adiar cada um."}]'::jsonb, 2, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D04', 'Contas a receber e adiantamentos', 'Financeiro', '02_FINANCEIRO', 'Títulos em aberto e recebimentos previstos.', 'Evita tratar uma proposta ou estimativa como entrada confirmada.', 'Cliente, documento, valor, data prevista, grau de confirmação e projeto.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Títulos em aberto por cliente","instrucao":"Envie o relatório de contas a receber em aberto, com cliente, documento, vencimento, valor original e saldo."},{"item":"Adiantamentos e previsão de recebimento","instrucao":"Identifique adiantamentos já recebidos. Para entradas futuras, indique data provável e se há confirmação do cliente ou apenas estimativa."}]'::jsonb, 3, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D05', 'Dívidas, parcelamentos e garantias', 'Financeiro', '02_FINANCEIRO', 'Posição atual de empréstimos, financiamentos e parcelamentos.', 'Mostra o peso do serviço da dívida e as restrições de garantias.', 'Credor, saldo devedor, parcelas, juros, principal e garantias.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Posição das dívidas e garantias","instrucao":"Relacione as operações vigentes com credor, referência do contrato, data do saldo, saldo devedor e garantia. Anexe o demonstrativo do credor."},{"item":"Cronograma de parcelas","instrucao":"Envie o cronograma de cada operação com vencimento, amortização, juros e valor da parcela. Indique parcelas vencidas e renegociações."}]'::jsonb, 4, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D06', 'Carteira de contratos, projetos ou pedidos em execução', 'Operacional', '04_OPERACIONAL', 'Trabalhos contratados em andamento ou a iniciar.', 'Relaciona a necessidade de capital e de capacidade a cada entrega.', 'Identificador, cliente, valor, etapa, prazos, custos previstos e pagos.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Carteira e etapas de execução","instrucao":"Envie uma planilha com código, cliente, valor contratado, etapa atual e datas previstas de início e conclusão."},{"item":"Aceites e pendências de entrega","instrucao":"Indique as etapas já aceitas pelo cliente e as pendentes. Anexe o registro de aceite disponível."},{"item":"Custos e pagamentos por entrega","instrucao":"Use o mesmo código para relacionar fornecedor, custo previsto, valor pago, saldo a pagar e vencimentos."}]'::jsonb, 5, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D07', 'Receita e faturamento por cliente e produto ou serviço', 'Comercial', '03_COMERCIAL', 'Faturamento mensal do período combinado, com o mês corrente separado.', 'Base para analisar receita, concentração de clientes e sazonalidade.', 'Pedidos, notas, cancelamentos, canal e mês de competência.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Pedidos e notas por mês, cliente, produto e canal","instrucao":"Exporte pedidos e notas fiscais do período combinado, com competência, cliente, produto ou serviço, canal e valor."},{"item":"Cancelamentos do período","instrucao":"Liste pedidos e notas cancelados, com documento original, data, valor e motivo."},{"item":"Faturamento parcial do mês corrente","instrucao":"Envie o mês em andamento em aba separada, informando até que dia foi apurado."}]'::jsonb, 6, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D08', 'Custos, despesas e DRE', 'Financeiro', '02_FINANCEIRO', 'Custos e despesas mensais do período combinado e projeção até o fim do ano.', 'Permite montar a DRE gerencial e as premissas do orçamento.', 'Conta, competência, centro de custo, fixo ou variável e itens extraordinários.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Custos e despesas mensais por conta","instrucao":"Envie o relatório mensal com competência, conta, descrição, valor e centro de custo. Identifique fixos, variáveis e extraordinários."},{"item":"DRE disponível","instrucao":"Anexe a DRE mensal disponível. Indique se é gerencial ou contábil e quais meses estão fechados."},{"item":"Projeção até o fim do ano","instrucao":"Apresente os meses restantes separadamente, indicando o que é realizado, o que é estimativa e como foi calculado."}]'::jsonb, 7, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D09', 'Orçamento e metas existentes', 'Planejamento estratégico', '06_PLANEJAMENTO_ESTRATEGICO', 'Orçamento e metas do ano corrente e propostas para o próximo, se houver.', 'Permite comparar com o realizado sem inventar um orçamento que não existiu.', 'Versão, aprovação e premissas. Informar quando não existir.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Orçamento e metas do ano corrente","instrucao":"Anexe o orçamento e o documento de metas usados pela gestão. Se não existirem, registre nas observações."},{"item":"Propostas para o próximo ano","instrucao":"Envie planilhas ou apresentações já preparadas. Se ainda não houver, informe."},{"item":"Versões, aprovações e premissas","instrucao":"Para cada versão, informe data, responsável, situação da aprovação e hipóteses usadas."}]'::jsonb, 8, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D10', 'Casos comerciais e perdas registradas', 'Comercial', '03_COMERCIAL', 'Amostra de negociações recentes, ganhas e perdidas.', 'Testa hipóteses sobre preço, canal e argumentos de venda.', 'Proposta, resposta do cliente, resultado, motivo e evidência.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Propostas da amostra","instrucao":"Selecione uma amostra de negociações recentes, dê um código a cada uma e anexe a proposta com data, produto, preço e condições."},{"item":"Respostas e resultados","instrucao":"Para cada código, informe a resposta do cliente, a data e o desfecho: ganho, perdido ou em aberto."},{"item":"Motivos de perda com evidências","instrucao":"Registre o motivo informado pelo cliente. Quando for só percepção da equipe, identifique como hipótese."}]'::jsonb, 9, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D11', 'Capacidade, prazos e retrabalho', 'Operacional', '04_OPERACIONAL', 'Prazos prometidos e realizados, retrabalho e capacidade atual.', 'Verifica o limite de atendimento e a qualidade das entregas.', 'Datas previstas e reais, aceites, custo de retrabalho e capacidade disponível.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Prazos previstos, realizados e aceites","instrucao":"Relacione entregas do período com data prometida, data efetiva e data de aceite. Indique a causa registrada dos atrasos."},{"item":"Retrabalho e custos","instrucao":"Liste os retornos para correção com descrição, horas, materiais e custo. Sinalize valores estimados."},{"item":"Capacidade atual","instrucao":"Informe a capacidade por equipe ou unidade, com a unidade de medida e a agenda já comprometida."}]'::jsonb, 10, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D12', 'Sistemas, relatórios e responsáveis', 'Sistemas e processos', '04_OPERACIONAL', 'Sistemas e planilhas usados na rotina e quem os atualiza.', 'Escolhe as fontes de dados sem exigir troca de sistema.', 'Sistema, relatório, responsável, frequência e exemplo de exportação. Sem senhas.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Sistemas, relatórios e responsáveis","instrucao":"Liste sistemas e planilhas de vendas, operação e finanças, com quem atualiza, frequência e campos disponíveis."},{"item":"Exemplo de exportação","instrucao":"Anexe uma exportação de exemplo em XLSX, CSV ou PDF, ou descreva o caminho até o relatório. Não inclua senhas."}]'::jsonb, 11, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D13', 'Equipe, contratos e despesas recorrentes', 'Recursos humanos', '05_RECURSOS_HUMANOS', 'Estrutura atual da equipe, contratos recorrentes e mudanças previstas.', 'Avalia capacidade e custo fixo.', 'Funções, custo total e dependências. Evitar dados pessoais desnecessários.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Funções da equipe e custos totais","instrucao":"Envie o quadro por função, área e vínculo, com quantidade de pessoas e custo mensal total. A identificação por função basta."},{"item":"Contratos e despesas recorrentes","instrucao":"Relacione aluguel, softwares e serviços terceirizados, com fornecedor, objeto, valor, vencimento e reajuste."},{"item":"Mudanças previstas","instrucao":"Liste contratações, desligamentos ou reajustes previstos, com mês e efeito estimado no custo."}]'::jsonb, 12, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D14', 'Necessidades e investimentos propostos', 'Planejamento estratégico', '06_PLANEJAMENTO_ESTRATEGICO', 'Investimentos e iniciativas desejados para o próximo período.', 'Ajuda a priorizar investimentos e iniciativas.', 'Justificativa, custo, prazo, capacidade adicional e retorno quando calculável.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Investimentos propostos e justificativa","instrucao":"Liste cada investimento com mês previsto, área solicitante e necessidade atendida."},{"item":"Custo, prazo e retorno estimado","instrucao":"Informe custo estimado, fonte do valor, desembolso, prazo para operar e retorno quando houver base."}]'::jsonb, 13, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D15', 'Premissas tributárias', 'Contábil e tributário', '02_FINANCEIRO', 'Regime tributário e regras aplicáveis ao período planejado.', 'Evita projetar impostos sem validação do contador.', 'Validação da contabilidade com efeitos em margem, preço e caixa.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Regime e premissas do período","instrucao":"Peça à contabilidade um resumo do regime e das premissas, com tributos, base, alíquota e momento do recolhimento."},{"item":"Validação da contabilidade","instrucao":"Anexe a memória de cálculo ou o e-mail de validação do contador, com data e pontos em análise."}]'::jsonb, 14, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.request_templates (code, title, category, stage, description, purpose, minimum_content,
  examples, accepted_formats, instructions, checklist, sort_order, active) values (
  'D16', 'Histórico comparável de anos anteriores', 'Financeiro', '02_FINANCEIRO', 'Resultados mensais dos dois anos anteriores, se disponíveis.', 'Aprofunda a análise de sazonalidade. Não bloqueia o início do trabalho.', 'Mesmas contas e critérios, ou explicação das diferenças.',
  null, array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Histórico do ano anterior","instrucao":"Envie a DRE ou relatório gerencial mensal do ano anterior. Identifique meses ausentes e a fonte."},{"item":"Histórico de dois anos atrás","instrucao":"Envie o mesmo conjunto mensal, se disponível."},{"item":"Critérios e diferenças entre os anos","instrucao":"Descreva mudanças de plano de contas ou de critério entre os anos e indique as correspondências."}]'::jsonb, 15, true)
on conflict (code) do update set title = excluded.title, category = excluded.category, stage = excluded.stage,
  description = excluded.description, purpose = excluded.purpose, minimum_content = excluded.minimum_content,
  examples = excluded.examples, accepted_formats = excluded.accepted_formats, instructions = excluded.instructions,
  checklist = excluded.checklist, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A01', 'acao_5w2h', 'Conferir o contrato assinado e registrar a data de início', 'Fixar escopo, vigência e calendário do trabalho', 'Governança', 'Comparar a via assinada com a proposta e registrar divergências', 'media', 'Contrato assinado',
  null, null, 'Contrato arquivado e datas confirmadas', null, 1, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A02', 'acao_5w2h', 'Nomear interlocutor e responsáveis pelos dados', 'Evitar centralização e pedidos sem dono', 'Equipe do cliente', 'Indicar titular e substituto para financeiro, comercial e operação', 'media', 'Nenhuma',
  null, null, 'Nomes, contatos e responsabilidades registrados', null, 2, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A03', 'acao_5w2h', 'Aprovar agenda, canal de comunicação e prioridades', 'Dar ritmo à execução dentro da capacidade contratada', 'Governança', 'Validar até três prioridades do primeiro ciclo e o calendário de encontros', 'media', 'Contrato e interlocutor definidos',
  null, null, 'Ata com decisões e encontros do primeiro ciclo', null, 3, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A04', 'acao_5w2h', 'Levantar saldos e obrigações urgentes', 'Identificar risco de interrupção da operação', 'Financeiro', 'Reunir saldos livres e bloqueados, vencidos e obrigações dos próximos 14 dias', 'alta', 'Interlocutor financeiro definido',
  null, null, 'Base por banco e obrigação com vencimento e comprovante', null, 4, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A05', 'acao_5w2h', 'Levantar recebíveis e trabalhos em execução', 'Relacionar entradas esperadas aos desembolsos', 'Financeiro e operação', 'Exportar títulos e cronograma por contrato ou projeto com identificador único', 'alta', 'Interlocutor financeiro definido',
  null, null, 'Valor, data, probabilidade e projeto identificados', null, 5, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A06', 'acao_5w2h', 'Mapear dívidas e compromissos financeiros', 'Distinguir custo financeiro de amortização', 'Financeiro', 'Relacionar credor, saldo, parcelas, juros, garantias e atrasos', 'alta', 'Interlocutor financeiro definido',
  null, null, 'Contratos e saldos confrontados com as parcelas', null, 6, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A07', 'acao_5w2h', 'Montar a projeção de caixa de 13 semanas', 'Antecipar semanas com déficit de caixa', 'Caixa', 'Separar entradas confirmadas e estimadas, saídas e saldos semanais; marcar lacunas', 'alta', 'Saldos, recebíveis e dívidas levantados',
  null, null, 'Saldo inicial, entradas, saídas e saldos semanais rastreáveis', null, 7, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A08', 'acao_5w2h', 'Definir saldo mínimo e medidas para déficits', 'Transformar a previsão em decisões aprovadas', 'Direção', 'Rever prazos, despesas e execução; escolher medidas e responsáveis', 'alta', 'Projeção de caixa pronta',
  null, null, 'Limite, gatilhos e responsáveis formalizados', null, 8, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A09', 'acao_5w2h', 'Implantar a atualização semanal do caixa', 'Corrigir a previsão com o realizado', 'Financeiro', 'Atualizar em dia fixo da semana, comparar previsto e realizado e acrescentar uma semana', 'alta', 'Projeção de caixa pronta',
  null, null, 'Primeiro previsto versus realizado com diferenças explicadas', null, 9, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A10', 'acao_5w2h', 'Consolidar dados mensais do ano', 'Conhecer o ponto de partida e a sazonalidade', 'Financeiro e comercial', 'Reunir meses fechados, mês corrente separado e projeção até o fim do ano', 'media', 'Interlocutores definidos',
  null, null, 'Receita, custos e despesas com competência e fonte', null, 10, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A11', 'acao_5w2h', 'Selecionar uma amostra de casos para análise', 'Investigar margem e descasamentos reais', 'Direção e operação', 'Escolher casos representativos: recorrente, grande, com retrabalho, perdido e com pressão de caixa', 'media', 'Lista de contratos ou projetos',
  null, null, 'Amostra aprovada', null, 11, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A12', 'acao_5w2h', 'Montar a primeira leitura de DRE e margem', 'Separar resultado econômico de saldo bancário', 'Controladoria', 'Classificar custos diretos, variáveis e fixos e apontar pendências', 'media', 'Dados mensais e amostra',
  null, null, 'DRE preliminar e margem com tributos e rateios explícitos', null, 12, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A13', 'acao_5w2h', 'Mapear o processo da venda ao recebimento', 'Localizar atrasos, aprovações e retrabalho', 'Operação', 'Percorrer orçamento, aprovação, execução, faturamento e recebimento', 'media', 'Interlocutores e amostra definidos',
  null, null, 'Fluxo atual, responsáveis, documentos e principais gargalos documentados', null, 13, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A14', 'acao_5w2h', 'Validar o diagnóstico e as causas prioritárias', 'Evitar tratar percepção como causa comprovada', 'Direção', 'Cruzar fatos e hipóteses; usar Pareto ou 5 Porquês com base em dados', 'media', 'DRE, processo e amostra analisados',
  null, null, 'Até três problemas com evidência, consequência e teste', null, 14, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A15', 'acao_5w2h', 'Aprovar e aplicar uma correção de processo', 'Começar a melhoria sem esperar o plano completo', 'Processo escolhido', 'A direção aprova; a equipe aplica em um caso em curso; a consultoria acompanha', 'media', 'Diagnóstico validado',
  null, null, 'Registro antes e depois e resultado observado', null, 15, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A16', 'acao_5w2h', 'Registrar o modelo de negócio atual e a SWOT', 'Escolher prioridades compatíveis com o negócio', 'Estratégia', 'Canvas atual e SWOT curta, ligando cada fator a uma fonte ou teste', 'media', 'Dados, amostra e processo analisados',
  null, null, 'Hipóteses separadas e escolhas pendentes identificadas', null, 16, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A17', 'acao_5w2h', 'Definir premissas comerciais do próximo ano', 'Construir a receita por volume, preço, mix e capacidade', 'Direção e comercial', 'Definir clientes ativos, pedidos, ticket médio, conversão, prazos e regiões', 'media', 'DRE, diagnóstico e SWOT',
  null, null, 'Premissas com fonte, responsável e grau de confirmação', null, 17, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A18', 'acao_5w2h', 'Levantar despesas, investimentos e capacidade do próximo ano', 'Financiar as iniciativas sem comprometer as entregas', 'Financeiro e operação', 'Separar fixo e variável, despesa e investimento, principal e juros', 'media', 'Premissas comerciais',
  null, null, 'Planilha de premissas e necessidades por mês', null, 18, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A19', 'acao_5w2h', 'Validar premissas tributárias com a contabilidade', 'Evitar projetar impostos sem revisão', 'Contabilidade', 'Confirmar regime, efeitos aplicáveis e tratamento de créditos e prazos', 'media', 'Premissas de despesas',
  null, null, 'Nota do contador e premissas rastreáveis', null, 19, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A20', 'acao_5w2h', 'Montar o orçamento gerencial preliminar', 'Ligar as escolhas à necessidade de caixa e margem', 'Orçamento', 'Mensalizar receita, DRE, caixa e investimentos; cenários base e pressionado', 'media', 'Premissas comerciais, despesas e tributos',
  null, null, 'Versão preliminar com lacunas e sensibilidades', null, 20, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A21', 'acao_5w2h', 'Decidir prioridades e recursos do próximo ano', 'Converter o orçamento em decisões executáveis', 'Direção', 'Aprovar versão inicial, limites e condições; adiar o que não tiver evidência', 'media', 'Orçamento preliminar',
  null, null, 'Versão aprovada ou pendências com responsáveis e prazos', null, 21, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A22', 'acao_5w2h', 'Aprovar indicadores e rotina de acompanhamento', 'Acompanhar causas e resultados sem excesso de relatórios', 'Gestão', 'Escolher poucos indicadores, com fórmula, fonte, período, responsável e alerta', 'media', 'Diagnóstico validado',
  null, null, 'Dicionário de indicadores aprovado', null, 22, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A23', 'acao_5w2h', 'Conferir faturamento e condições do contrato de consultoria', 'Evitar divergências administrativas no início', 'Administrativo', 'Conferir cláusulas de preço, período e vencimentos', 'baixa', 'Contrato assinado',
  null, null, 'Demonstrativo validado e vencimentos conferidos', null, 23, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A24', 'acao_5w2h', 'Revisar o efeito das primeiras decisões de caixa', 'Verificar se o risco diminuiu', 'Direção', 'Comparar projeção anterior, realizado e saldo mínimo aprovado', 'alta', 'Medidas e atualização semanal em curso',
  null, null, 'Desvios explicados e decisões atualizadas', null, 24, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A25', 'acao_5w2h', 'Encerrar o ciclo e pactuar o seguinte', 'Proteger foco e capacidade da consultoria', 'Governança', 'Revisar entregas, pendências, horas usadas e próximas prioridades', 'media', 'Orçamento, indicadores e revisão de caixa',
  null, null, 'Aceite registrado e agenda do próximo ciclo', null, 25, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A26', 'acao_5w2h', 'Fechar o ano e reconciliar a DRE gerencial', 'Trocar estimativas por valores realizados', 'Financeiro', 'Fechar os meses finais; a contabilidade valida classificações; a equipe concilia', 'media', 'Dados mensais consolidados',
  null, null, 'Diferenças identificadas e relatório fechado ou ressalvado', null, 26, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A27', 'acao_5w2h', 'Atualizar o orçamento com o fechamento do ano', 'Corrigir a primeira versão com dados reais', 'Orçamento', 'Revisar premissas relevantes e projeções; versionar as alterações', 'media', 'Prioridades decididas e ano fechado',
  null, null, 'Orçamento revisado com decisões aprovadas', null, 27, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A28', 'acao_5w2h', 'Testar orçamento e margem em novos trabalhos', 'Validar preço e prazo na rotina real', 'Operação e comercial', 'Aplicar o critério aprovado e registrar orçado versus realizado', 'media', 'DRE, correção de processo e prioridades',
  null, null, 'Casos comparáveis com desvio e causa documentada', null, 28, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A29', 'acao_5w2h', 'Avaliar canais de venda e parceiros', 'Reduzir atrito e escolher clientes com base em evidências', 'Modelo de negócio', 'Rever casos reais, origem das vendas e regras com parceiros; validar aspectos jurídicos se necessário', 'media', 'SWOT e testes de margem',
  null, null, 'Regras propostas e decisões de posicionamento', null, 29, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
insert into public.action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
  resources, expected_evidence, completion_criteria, basis, sort_order, active) values (
  'A30', 'acao_5w2h', 'Consolidar o diagnóstico e a revisão de 90 dias', 'Escolher o próximo trimestre com base nos resultados', 'Governança', 'Rever caixa, margem, processo, orçamento e lacunas; atualizar Canvas e SWOT', 'media', 'Orçamento atualizado e testes realizados',
  null, null, 'Até três prioridades aprovadas para o próximo ciclo', null, 30, true)
on conflict (code) do update set kind = excluded.kind, title = excluded.title, rationale = excluded.rationale,
  area = excluded.area, how = excluded.how, priority = excluded.priority, decision_inputs = excluded.decision_inputs,
  resources = excluded.resources, expected_evidence = excluded.expected_evidence,
  completion_criteria = excluded.completion_criteria, basis = excluded.basis, sort_order = excluded.sort_order;
