-- Gerado por scripts/gerar-seed-fiq.mjs. Não editar à mão.

-- Conteúdo de origem: portal CEOEXPRESS | Gestão FIQ Brasil (versão 10, commit bb4c9168).

begin;

insert into public.companies (id, legal_name, trade_name) values ('48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'FIQ Brasil', 'FIQ Brasil')
  on conflict (id) do nothing;

insert into public.projects (id, company_id, name, kind, description, starts_on, status, monthly_hours, drive_folder_url) values (
  'd7fc4064-e9e4-5317-8f17-825016b0f6da', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'Planejamento e execução 2026–2027', 'Assessoria em gestão estratégica',
  'Primeiro ciclo: caixa e obrigações (P1), margem e processo (P2), orçamento e escolhas (P3).',
  '2026-11-23', 'ativo', 20, 'https://drive.google.com/drive/folders/1lCo_Wt5s-dIATh7jf4rX2FGmkKSB_UeN')
  on conflict (id) do nothing;

insert into public.objectives (id, company_id, project_id, code, name, who_decides, decision_inputs, verification, sort_order) values (
  'eac07924-b495-5132-9bae-cc1d33593f20', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'P1', 'Caixa e obrigações', 'Em 30/11, Izaque define o saldo mínimo, escolhe medidas para os déficits e nomeia os executores. João apresenta as alternativas.', 'O Financeiro entrega saldos livres e bloqueados, vencidos, obrigações dos próximos 14 dias e projeção de 13 semanas. Separar recebimentos confirmados e estimados por projeto. Mostrar a primeira semana abaixo do mínimo, o valor faltante e o efeito de cada medida até o vencimento.', 'Toda sexta, confrontar previsão e extrato. Registrar valor e data previstos e realizados, obrigação paga e saldo após o vencimento. João apresenta o primeiro confronto em 07/12. Manter aberta a pendência se o déficit passou para outra semana.', 0)
  on conflict (id) do nothing;

insert into public.objectives (id, company_id, project_id, code, name, who_decides, decision_inputs, verification, sort_order) values (
  '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'P2', 'Margem e processo', 'Izaque e Operação selecionam cinco casos. Em 07/12, Izaque escolhe uma correção e nomeia quem a aplicará até 14/12. João acompanha o teste.', 'Entregar DRE preliminar de 2026 e fichas dos casos recorrente, grande, com retrabalho, perdido e com pressão de caixa. Incluir orçamento, receita, tributos, custos e datas da aprovação ao recebimento. No caso perdido, registrar proposta e motivo documentado. Quantificar o tempo ou valor afetado pelo gargalo.', 'Registrar a medida inicial e repetir a medição com o mesmo critério. Para atraso de faturamento, conferir dias entre medição e nota fiscal. Para margem, comparar orçamento e realizado com a mesma base de custos. Anexar os documentos e acompanhar a repetição em novos projetos.', 1)
  on conflict (id) do nothing;

insert into public.objectives (id, company_id, project_id, code, name, who_decides, decision_inputs, verification, sort_order) values (
  '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'P3', 'Orçamento e escolhas de 2027', 'João apresenta a versão preliminar em 14/12. Em 21/12, Izaque decide quais iniciativas financiar, seus limites e as condições de liberação.', 'Comercial, Financeiro, Operação e Contabilidade informam suas premissas. Separar histórico fechado de meses parciais. Informar carteira, preço, volume, capacidade, tributos, despesas e investimentos. Mostrar margem esperada, desembolso e menor saldo de caixa nos cenários base e de pressão.', 'Registrar cada iniciativa como aprovada, condicionada ou adiada, com valor, responsável e condição. Para lacunas relevantes, marcar revisão do orçamento preliminar. No primeiro fechamento de 2027, comparar receita, margem e caixa com o orçamento e registrar a decisão sobre os desvios.', 2)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '49e8cfe9-f460-55bd-912e-8d5abcb3817d', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D01', 'Via assinada e anexos aceitos', 'Institucional e contrato', '01_DOCUMENTOS_INSTITUCIONAIS', 'Izaque', '2026-11-23', 'nao_iniciado',
  'Vigência e CNPJ efetivos', 'Fixa calendário e resolve diferenças entre proposta e minuta', 'Documento integral, data e anexos identificados', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Contrato integral assinado","instrucao":"Envie a via assinada do contrato de prestação de serviços de assessoria entre FIQ Brasil e CEOEXPRESS, da primeira página até as assinaturas. O contrato social e as alterações societárias da FIQ são documentos distintos deste pedido."},{"item":"Anexos aceitos e identificação da vigência e do CNPJ","instrucao":"Junte a proposta e os anexos incorporados ao contrato, se houver, e eventuais aditivos assinados. Indique a data de início da prestação, o prazo de vigência e qual documento registra uma eventual mudança."},{"item":"Comprovante de inscrição e situação cadastral do CNPJ","instrucao":"Anexe o comprovante atualizado da Receita Federal referente ao CNPJ da FIQ que figura como contratante. Confira razão social, número do CNPJ, situação cadastral e data de emissão."}]'::jsonb, 0)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '3e06ba64-5a44-5db2-ae54-9dcc8b9025f5', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D02', 'Saldos por conta e extratos', 'Financeiro', '02_FINANCEIRO', 'Financeiro FIQ', '2026-11-24', 'nao_iniciado',
  'Saldo de abertura em 23/11; extratos recentes', 'Alimenta saldo inicial de caixa', 'Separar disponível, bloqueado, limite e conciliação pendente', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Saldo por conta em 23/11, com valores disponíveis, bloqueados e limites","instrucao":"Informe o saldo de abertura de cada conta em 23/11/2026. Identifique banco e conta por um apelido ou final do número. Separe dinheiro disponível, valores bloqueados e limite de crédito."},{"item":"Extratos recentes das contas","instrucao":"Anexe o extrato emitido pelo banco para cada conta, com datas inicial e final, movimentações e saldos que permitam conferir a abertura de 23/11."},{"item":"Pendências de conciliação","instrucao":"Liste os lançamentos ainda sem correspondência entre banco e sistema financeiro. Para cada diferença, indique conta, data, valor e o que falta conferir."}]'::jsonb, 1)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '86ee6b8f-f6aa-5978-9de8-30f38f79eeb0', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D03', 'Contas a pagar e vencidos', 'Financeiro', '02_FINANCEIRO', 'Financeiro FIQ', '2026-11-24', 'nao_iniciado',
  'Próximas 13 semanas e atrasos', 'Identifica obrigações e risco imediato', 'Credor, vencimento, valor, projeto e criticidade', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Contas a vencer nas próximas 13 semanas","instrucao":"Exporte o relatório de contas a pagar das 13 semanas a partir de 23/11/2026. Use uma linha por título ou parcela, com credor, documento, vencimento, valor em aberto e projeto, quando houver."},{"item":"Obrigações vencidas com indicação de criticidade","instrucao":"Separe os títulos já vencidos na abertura. Indique dias de atraso, previsão de pagamento e a consequência de adiar cada obrigação, como a suspensão de uma instalação."}]'::jsonb, 2)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '9e1bf3cf-dc38-5505-89b4-70e28e9f1162', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D04', 'Recebíveis e adiantamentos', 'Financeiro', '02_FINANCEIRO', 'Financeiro FIQ', '2026-11-25', 'nao_iniciado',
  'Títulos em aberto e recebimentos previstos', 'Evita tratar proposta como entrada confirmada', 'Cliente, documento, valor, data, probabilidade e projeto', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Títulos em aberto por cliente e projeto","instrucao":"Envie o relatório de contas a receber em aberto na data da extração. Por título, informe cliente, projeto, nota ou cobrança, vencimento, valor original e saldo a receber."},{"item":"Adiantamentos e previsão de recebimento com probabilidade","instrucao":"Identifique os adiantamentos já recebidos, com valor, data e projeto. Para entradas futuras, indique data provável e se há confirmação do cliente ou apenas estimativa."}]'::jsonb, 3)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  'b54a3a23-cc08-5b39-b0ca-06409b69016d', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D05', 'Dívidas, parcelamentos e garantias', 'Financeiro', '02_FINANCEIRO', 'Financeiro FIQ', '2026-11-25', 'nao_iniciado',
  'Posição atual e cronograma', 'Mostra serviço da dívida e restrições', 'Saldo devedor, parcelas, juros, principal e garantias', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Posição das dívidas e garantias","instrucao":"Relacione empréstimos, financiamentos e parcelamentos vigentes. Por operação, informe credor, referência do contrato, data do saldo, saldo devedor e garantia vinculada, se houver. Anexe o demonstrativo do credor."},{"item":"Cronograma de parcelas com principal e juros","instrucao":"Envie o cronograma de cada operação, com vencimento, amortização do principal, juros e valor da parcela. Identifique parcelas vencidas e condições renegociadas."}]'::jsonb, 4)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '52fa58fc-1d32-50c8-b9c1-75883dba4b27', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D06', 'Projetos contratados e execução', 'Operacional', '04_OPERACIONAL', 'Operação FIQ', '2026-11-25', 'nao_iniciado',
  'Projetos em curso e a iniciar', 'Relaciona necessidade de capital por projeto', 'Valor, etapa, aceite, instalador, cidade, custo e pagamentos', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Carteira de projetos e etapas de execução","instrucao":"Envie uma planilha dos projetos contratados em andamento ou ainda por iniciar. Por projeto, informe código, cliente, valor contratado, etapa atual e datas previstas de início e conclusão."},{"item":"Aceites, instaladores e cidades","instrucao":"Para cada projeto, identifique cidade, instalador designado e etapa aceita pelo cliente. Anexe o termo, e-mail ou registro de aceite disponível e indique os aceites pendentes."},{"item":"Custos e pagamentos por projeto","instrucao":"Use o mesmo código de projeto para relacionar fornecedor ou instalador, custo previsto, valor já pago, saldo a pagar e respectivos vencimentos."}]'::jsonb, 5)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  'b7250bae-70eb-5cab-bc30-3327aa7b3acb', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D07', 'Receita e faturamento por cliente e serviço', 'Comercial', '03_COMERCIAL', 'Comercial + financeiro FIQ', '2026-12-04', 'nao_iniciado',
  'Mensal jan-out/2026; novembro parcial separado', 'Base de receita, concentração e sazonalidade', 'Pedidos, notas, cancelamentos, canal e competência', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Pedidos e notas por mês, cliente, serviço e canal","instrucao":"Exporte os pedidos e as notas fiscais de janeiro a outubro de 2026. Identifique mês de competência, cliente, serviço, canal, número do pedido e da nota e valor de cada um, permitindo relacionar pedido e faturamento."},{"item":"Cancelamentos do período","instrucao":"Liste pedidos e notas cancelados no período, indicando o documento original, data do cancelamento, valor e motivo registrado."},{"item":"Faturamento parcial de novembro","instrucao":"Envie novembro de 2026 em aba ou arquivo separado. Informe até qual dia o faturamento foi apurado e use os mesmos campos dos meses fechados."}]'::jsonb, 6)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '81ea41f5-e444-5ccb-846f-ae199e5841a5', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D08', 'Custos, despesas e DRE disponível', 'Financeiro', '02_FINANCEIRO', 'Financeiro + contabilidade FIQ', '2026-12-04', 'nao_iniciado',
  'Mensal jan-out/2026; projeção nov-dez', 'DRE preliminar e premissas do orçamento', 'Contas, competência, projeto, fixo/variável e itens extraordinários', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Custos e despesas mensais por conta e projeto","instrucao":"Envie o relatório mensal de janeiro a outubro de 2026, com mês de competência, conta, descrição, valor e projeto quando aplicável. Identifique custos fixos, variáveis e gastos extraordinários."},{"item":"DRE disponível de janeiro a outubro","instrucao":"Anexe a Demonstração do Resultado do Exercício disponível para janeiro a outubro de 2026, por mês. Identifique a origem, gerencial ou contábil, e quais meses estão fechados."},{"item":"Projeções de novembro e dezembro","instrucao":"Apresente novembro e dezembro de 2026 separadamente, com valores previstos por conta. Identifique o que já foi realizado, o que é estimativa e como o valor foi calculado."}]'::jsonb, 7)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '635785f1-e0a6-57f7-b631-5a3b41b254b5', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D09', 'Orçamento e metas existentes', 'Planejamento estratégico', '06_PLANEJAMENTO_ESTRATEGICO', 'Izaque + financeiro FIQ', '2026-12-04', 'nao_iniciado',
  '2026 e propostas de 2027, se houver', 'Permite comparar realizado sem inventar orçamento anterior', 'Versão, aprovação e premissas; informar se inexistentes', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Orçamento e metas de 2026 ou registro de indisponibilidade","instrucao":"Anexe o orçamento de 2026 e o documento de metas usado pela gestão, indicando indicador, período e valor-alvo. Se algum documento não foi elaborado, registre isso nas observações."},{"item":"Propostas para 2027 ou registro de indisponibilidade","instrucao":"Envie as planilhas ou apresentações já preparadas para 2027. Identifique os meses, áreas e metas contemplados. Se ainda não houver proposta, informe essa situação."},{"item":"Versões, aprovações e premissas","instrucao":"Para cada versão enviada, informe data, responsável e situação da aprovação. Descreva as hipóteses usadas, como volume de projetos, preço médio ou custo de instalação."}]'::jsonb, 8)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  'd0e0ade9-9948-52f6-a391-4d5718689d7c', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D10', 'Casos comerciais e perdas registradas', 'Comercial', '03_COMERCIAL', 'Comercial FIQ', '2026-11-30', 'nao_iniciado',
  'Amostra inicial sugerida de cinco casos', 'Testa hipóteses de preço, canal e proteção comercial', 'Proposta, resposta, resultado, motivo e evidência', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Propostas da amostra de casos","instrucao":"Selecione, como amostra inicial, cinco negociações de 2026, se disponíveis. Atribua um código a cada caso e anexe a proposta enviada, com data, serviço, preço e condições comerciais."},{"item":"Respostas e resultados","instrucao":"Para cada código, informe a resposta do cliente, a data e o desfecho: ganho, perdido ou em aberto. Anexe o registro correspondente do CRM, e-mail ou mensagem, quando disponível."},{"item":"Motivos de perda com evidências","instrucao":"Para cada perda, registre o motivo informado pelo cliente e vincule a evidência ao código do caso. Quando houver apenas percepção do vendedor, identifique-a como hipótese."}]'::jsonb, 9)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  'b9644b2f-d537-51f5-bee1-03fc329fd143', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D11', 'Rede, capacidade, atrasos e retrabalho', 'Operacional', '04_OPERACIONAL', 'Operação FIQ', '2026-12-04', 'nao_iniciado',
  'Projetos de 2026 e capacidade atual', 'Verifica limite de atendimento e qualidade', 'Datas previstas/reais, aceite, custo de retrabalho e disponibilidade', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Prazos previstos, realizados e aceites","instrucao":"Nos projetos de 2026, relacione código do projeto, cidade, data prometida, data efetiva da instalação e data do aceite. Indique a causa registrada dos atrasos e anexe o aceite disponível."},{"item":"Retrabalho e respectivos custos","instrucao":"Liste os retornos para correção por projeto. Descreva o problema, horas adicionais, materiais, deslocamentos e custo total. Sinalize valores estimados."},{"item":"Disponibilidade atual da rede","instrucao":"Informe a capacidade atual por instalador ou equipe, região atendida, unidade de capacidade (por exemplo, instalações por semana) e agenda já comprometida."}]'::jsonb, 10)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '5cfecb8b-4f45-5e3b-bdbf-7398404a3f2a', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D12', 'Sistemas, relatórios e responsáveis', 'Sistemas e processos', '04_OPERACIONAL', 'Interlocutor FIQ', '2026-11-30', 'nao_iniciado',
  'Rotina atual', 'Escolhe fonte de dados sem trocar sistema de imediato', 'Demonstração e exportação; acesso mínimo necessário', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Sistemas, relatórios e responsáveis","instrucao":"Liste os sistemas e planilhas utilizados em vendas, projetos e finanças. Para cada relatório, indique quem atualiza, frequência, campos disponíveis e onde a informação é consultada."},{"item":"Exemplo de exportação ou demonstração da rotina","instrucao":"Anexe uma exportação de exemplo em XLSX, CSV ou PDF. Quando a rotina depender de consulta em tela, descreva o caminho até o relatório e o filtro aplicado. Não inclua senhas."}]'::jsonb, 11)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '0dba9b75-3d1d-53ae-b218-a3c2cdd11f47', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D13', 'Pessoas, contratos e despesas recorrentes', 'Recursos humanos', '05_RECURSOS_HUMANOS', 'Administrativo FIQ', '2026-12-04', 'nao_iniciado',
  'Estrutura atual e mudanças previstas em 2027', 'Avalia capacidade e custo fixo', 'Papéis, custo total e dependências; evitar dados pessoais desnecessários', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Papéis da equipe e custos totais","instrucao":"Envie o quadro atual por função, área e tipo de vínculo, com quantidade de pessoas, atividade principal e custo mensal total. A identificação por função é suficiente."},{"item":"Contratos e despesas recorrentes","instrucao":"Relacione contratos recorrentes, como aluguel, software e serviços terceirizados. Indique fornecedor, objeto, periodicidade, valor, vencimento e reajuste. Identifique os serviços dos quais a operação depende."},{"item":"Mudanças previstas para 2027","instrucao":"Liste admissões, contratações, encerramentos ou reajustes previstos para 2027. Indique função ou serviço afetado, mês esperado e efeito mensal estimado no custo."}]'::jsonb, 12)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '0bb69504-e654-589d-90a4-4cb3718d9191', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D14', 'Necessidades e investimentos propostos', 'Planejamento estratégico', '06_PLANEJAMENTO_ESTRATEGICO', 'Izaque + operação FIQ', '2026-12-11', 'nao_iniciado',
  'Meses de 2027', 'Prioriza CAPEX e iniciativas', 'Justificativa, custo, prazo, capacidade e retorno quando calculável', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Investimentos propostos por mês e justificativa","instrucao":"Liste cada investimento proposto para 2027, como aquisição de equipamento ou expansão da capacidade. Informe mês previsto, área solicitante e qual necessidade operacional será atendida."},{"item":"Custo, prazo, capacidade e retorno estimado","instrucao":"Por investimento, informe custo estimado, fonte do valor, calendário de desembolso e prazo para entrar em operação. Quantifique capacidade adicional e retorno quando houver base para o cálculo."}]'::jsonb, 13)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  '63e1b1a2-153a-59c8-a97a-af83b033ddb1', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D15', 'Premissas tributárias aplicáveis', 'Contábil e tributário', '02_FINANCEIRO', 'Contabilidade FIQ', '2026-12-11', 'nao_iniciado',
  'Regime e regras aplicáveis a 2027', 'Evita extrapolação tributária sem suporte', 'Validação do contador com efeitos em margem, preço e caixa', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Regime e premissas para 2027","instrucao":"Solicite à contabilidade um resumo do regime adotado e das premissas usadas na projeção de 2027. Por serviço ou receita, identifique tributos considerados, base, alíquota e momento previsto do recolhimento."},{"item":"Validação da contabilidade e efeitos em margem, preço e caixa","instrucao":"Anexe a memória de cálculo, nota técnica ou e-mail de validação do contador, com data. Indique o efeito esperado sobre preço, margem e desembolso e destaque pontos ainda em análise."}]'::jsonb, 14)
  on conflict (id) do nothing;

insert into public.info_requests (id, company_id, project_id, code, title, category, stage, owner_label, due_on, status,
  description, purpose, minimum_content, accepted_formats, instructions, checklist, sort_order) values (
  'c73f9968-90c4-51ea-8abb-3f899698158d', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'D16', 'Histórico comparável adicional', 'Financeiro', '02_FINANCEIRO', 'Financeiro FIQ', '2026-12-11', 'nao_iniciado',
  '2024 e 2025, se disponível', 'Aprofunda sazonalidade; não bloqueia caixa inicial', 'Mesmas contas e critérios ou ponte das diferenças', array['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','txt','png','jpg','jpeg','webp'], '1. Leia a orientação de cada subitem.
2. Clique em "Enviar arquivo" e selecione o arquivo (até 25 MB).
3. Informe o período a que os dados se referem, a fonte (sistema ou responsável) e uma breve descrição.
4. Marque os subitens atendidos pelo arquivo e confirme o envio.
5. Acompanhe o status: "Enviado" significa recebido, não validado. A consultoria analisa e aprova ou pede complementação.', '[{"item":"Histórico disponível de 2024","instrucao":"Se disponível, envie a DRE ou relatório gerencial mensal de 2024, com receitas, custos, despesas e resultado. Identifique meses ausentes e a fonte dos dados."},{"item":"Histórico disponível de 2025","instrucao":"Envie o mesmo conjunto mensal para 2025, se disponível. Identifique a fonte, o período coberto e os meses com fechamento parcial."},{"item":"Critérios comparáveis e diferenças entre os anos","instrucao":"Descreva mudanças de plano de contas, classificação ou critério de apuração entre os anos e 2026. Quando uma conta mudou de nome ou composição, indique a correspondência. Caso o histórico não exista, informe os anos indisponíveis."}]'::jsonb, 15)
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'ae1e89f8-db9c-5d90-9119-ac755e9dd845', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A01', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Conferir a via assinada e registrar a data efetiva', 'Fixar escopo, vigência, CNPJ e calendário sem reiniciar o contrato', 'Governança', 'Comparar a via assinada com a última minuta e a proposta; registrar divergências', 'João + Izaque', '2026-11-23', '2026-11-23', 'Capacidade contratada',
  'Via assinada', 'Cl. 1, 2 e 5', 'Arquivo arquivado e datas de contrato confirmadas', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '17ce7ad1-e9df-5390-9c63-562d90e587ce', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A02', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Nomear interlocutor e responsáveis pelos dados', 'Evitar centralização e pedidos sem dono', 'Equipe FIQ', 'Indicar titular e substituto de financeiro, comercial e operação', 'Izaque', '2026-11-23', '2026-11-23', 'Rotina interna',
  'Nenhuma', 'Cl. 7.2', 'Nomes, contatos e responsabilidades registrados', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'd9b3bddc-2892-536e-b5f6-00b7c32ee30a', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A03', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Aprovar agenda, canal e três prioridades', 'Dar ritmo à execução dentro de 20 horas mensais', 'Governança', 'Validar P1 caixa, P2 margem e processo, P3 orçamento e escolhas', 'Izaque + João', '2026-11-23', '2026-11-23', 'Capacidade contratada',
  'A01 e A02', 'Cl. 3.3, 6 e 7', 'Ata com decisões e cinco encontros do primeiro ciclo', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'caf42dba-6d2a-5ba7-97b0-0973fe6a8073', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A04', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Disponibilizar saldos e obrigações urgentes', 'Identificar risco de interrupção da operação', 'Financeiro', 'Entregar saldos livres e bloqueados, vencidos e próximos 14 dias', 'Financeiro FIQ', '2026-11-23', '2026-11-24', 'Rotina interna',
  'A02', 'Cl. 3.1 e 7.3', 'Base por banco e obrigação com vencimento e comprovante', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '3c52b9ea-fc51-57ae-a46d-51a634bb05c1', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A05', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Entregar carteira de recebíveis e projetos ativos', 'Relacionar entradas esperadas aos desembolsos de execução', 'Financeiro e operação', 'Exportar títulos e cronograma por projeto com identificador único', 'Financeiro + operação FIQ', '2026-11-23', '2026-11-25', 'Rotina interna',
  'A02', 'Cl. 3.1', 'Valor, data, probabilidade e projeto identificados', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '6db50780-4f0c-5004-a7ec-66d61a4733d3', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A06', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Entregar mapa de dívidas e compromissos', 'Distinguir custo financeiro de amortização', 'Financeiro', 'Relacionar credor, saldo, parcelas, juros, garantias e atrasos', 'Financeiro FIQ', '2026-11-23', '2026-11-25', 'Rotina interna',
  'A02', 'Cl. 3.1', 'Contratos e saldo confrontados com parcelas', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '698c488c-dc4d-5f09-96ea-1faa9fc8f99a', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A07', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Publicar primeira projeção de 13 semanas', 'Antecipar semanas com déficit de caixa', 'Caixa', 'Estruturar 23/11 a 21/02; separar confirmado e estimado; marcar lacunas', 'João', '2026-11-25', '2026-11-30', 'Dentro de 4h financeiras do ciclo 1',
  'A04 a A06', 'Cl. 3.1 e proposta p. 4', 'Saldo inicial, entradas, saídas, saldos semanais e lacunas rastreáveis', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '12f29917-697b-587b-9071-c1901805ca7d', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A08', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Definir saldo mínimo e decisões para déficits', 'Transformar a previsão em medidas aprovadas', 'Direção', 'Rever folha, tributos, execução e prazos; escolher medidas por projeto', 'Izaque', '2026-11-30', '2026-11-30', 'Custos financeiros a aprovar antes de contratar',
  'A07', 'Cl. 1.2 e 3.1', 'Limite, gatilhos e responsáveis formalizados', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'd687d2cf-6df4-553a-9bbf-b1f780c42774', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A09', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Implantar atualização semanal do caixa', 'Corrigir a previsão com o realizado', 'Financeiro', 'Atualizar toda sexta e enviar antes do encontro; acrescentar semana futura', 'Financeiro FIQ', '2026-11-30', '2026-12-07', 'Rotina interna; análise de João dentro do ciclo',
  'A07', 'Cl. 3.1 e 3.2', 'Primeiro previsto versus realizado com diferenças explicadas', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'c2cb97a1-4df0-5ce1-864e-951cf799b7ef', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A10', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Consolidar dados mensais de 2026', 'Conhecer o ponto de partida e a sazonalidade', 'Financeiro e comercial', 'Jan-out fechado conforme disponibilidade; novembro parcial separado; projeção nov-dez', 'Financeiro FIQ', '2026-11-23', '2026-12-04', 'Rotina interna',
  'A02', 'Cl. 3.1 e 7.3', 'Receita, custos e despesas com competência e fonte', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'aa7295fa-7c47-5c0e-920a-c91ca8565f2c', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A11', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Selecionar amostra inicial de projetos', 'Investigar margem e descasamentos reais', 'Direção e operação', 'Propor cinco casos: recorrente, grande, retrabalho, perdido e pressão de caixa', 'Izaque + operação FIQ', '2026-11-25', '2026-11-30', 'Rotina interna',
  'Lista de projetos', 'Cl. 4.2', 'Amostra aprovada; não é teto contratual', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '07a3d62d-3dd2-5c42-a0d6-ee8ab724e876', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A12', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Montar primeira leitura de DRE e margem', 'Separar resultado econômico de saldo bancário', 'Controladoria gerencial', 'Classificar custos diretos, variáveis e fixos; identificar pendências da amostra', 'João', '2026-12-01', '2026-12-07', 'Dentro de 3h de resultado do ciclo 1',
  'A10 e A11', 'Cl. 3.1', 'DRE preliminar e margem com tributos e rateios explícitos', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '049640b2-d85d-5222-b901-a025802cc2d4', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A13', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Mapear orçamento até recebimento', 'Localizar atrasos, aprovações e retrabalho', 'Operação', 'Percorrer orçamento, aprovação, instalação, medição, faturamento e recebimento', 'Operação FIQ', '2026-11-25', '2026-12-04', 'Rotina interna',
  'A02 e A11', 'Cl. 3.3', 'Fluxo atual, donos, documentos e dois gargalos documentados', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'aac28a74-8ce2-518d-9a1a-d94dead97776', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A14', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Validar diagnóstico e causas prioritárias', 'Evitar tratar percepção como causa comprovada', 'Direção', 'Cruzar fatos e hipóteses; aplicar Pareto ou 5 Porquês somente com base', 'João + Izaque', '2026-12-04', '2026-12-07', 'Dentro de 2h de diagnóstico do ciclo 1',
  'A10 a A13', 'Cl. 1.3, 3 e 4', 'Até três problemas com evidência, consequência e teste', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'f13d5b12-7a7e-53ac-8064-2041556e9d05', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A15', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Aprovar e executar uma correção de processo', 'Começar a melhoria sem esperar o plano completo', 'Processo escolhido', 'Izaque aprova; equipe aplica em projeto em curso; João acompanha', 'Responsável interno a nomear', '2026-12-07', '2026-12-14', 'Custo a levantar e aprovar se houver',
  'A14', 'Cl. 1.2 e 3.4', 'Registro antes/depois e resultado observado', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '547a742f-c37d-5561-98a9-7ecb004d5f63', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A16', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Registrar modelo atual e SWOT com evidências', 'Escolher prioridades compatíveis com o negócio', 'Estratégia', 'Canvas atual e SWOT curta; ligar cada fator à fonte ou teste', 'João + Izaque', '2026-12-01', '2026-12-07', 'Dentro de 2h de diagnóstico do ciclo 1',
  'A10, A11 e A13', 'Cl. 4.1 e 4.2', 'Hipóteses separadas e escolhas pendentes identificadas', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'd7a76724-a32e-5bcd-8aac-1dc578ba8cb5', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A17', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Definir premissas comerciais de 2027', 'Construir receita por volume, preço, mix e capacidade', 'Direção e comercial', 'Definir clientes ativos, pedidos, ticket, conversão, prazos e regiões', 'Izaque + comercial FIQ', '2026-12-07', '2026-12-11', 'Rotina interna',
  'A12, A14 e A16', 'Cl. 4.1', 'Premissas com fonte, dono e grau de confirmação', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'fdce4d06-02eb-5a5b-b273-6570d2769f3b', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A18', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Levantar despesas, investimentos e capacidade 2027', 'Financiar iniciativas escolhidas sem comprometer a entrega', 'Financeiro e operação', 'Separar fixo/variável, OPEX/CAPEX, principal/juros e capacidade da rede', 'Financeiro + operação FIQ', '2026-12-07', '2026-12-11', 'Valores a levantar; sem autorizar gasto',
  'A14 e A17', 'Cl. 3.1 e 4.3', 'Planilha de premissas e necessidades por mês', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '2a915910-1c5d-588e-a338-98828661bc0d', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A19', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Validar premissas tributárias com a contabilidade', 'Evitar extrapolar impostos de 2026 sem revisão', 'Contabilidade', 'Informar regime, efeitos aplicáveis em 2027 e tratamento de créditos/prazos', 'Contabilidade FIQ', '2026-12-07', '2026-12-11', 'Honorários externos a confirmar se houver',
  'A18', 'Cl. 4.3; apoio externo', 'Nota técnica do contador e premissas rastreáveis', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '191f2a24-156e-58f0-8b32-a6aeb4a8358b', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A20', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Modelar orçamento gerencial preliminar de 2027', 'Ligar escolhas à necessidade de caixa e margem', 'Orçamento', 'Mensalizar receita, DRE, caixa e CAPEX; cenários base e pressão', 'João', '2026-12-11', '2026-12-14', 'Dentro de 4h de orçamento do ciclo 1',
  'A17 a A19', 'Cl. 3.1 e 4.3', 'Versão preliminar com lacunas e sensibilidades materiais', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'b1a4c5d2-ffe5-5552-be63-4f15e9c923e6', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A21', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Decidir prioridades e recursos de 2027', 'Converter o orçamento em decisões executáveis', 'Direção', 'Aprovar versão inicial, limites e condições; adiar o que não tiver evidência', 'Izaque', '2026-12-14', '2026-12-21', 'Recursos só após aprovação',
  'A20', 'Cl. 1.2 e 3.4', 'Versão aprovada ou pendências com donos e prazo', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'f894e86d-1c5c-55db-bec5-09efde2094a0', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A22', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Aprovar dicionário de indicadores e rotina', 'Acompanhar causas e resultados sem painel excessivo', 'Gestão', 'Escolher seis indicadores iniciais e até dois complementares', 'João + donos dos dados', '2026-12-07', '2026-12-21', 'Dentro de 2h de registro e indicadores do ciclo 1',
  'A14', 'Cl. 1.3 e 3.4', 'Fórmula, fonte, período, responsável e alerta definidos', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '22cf2957-1390-5ae2-9372-d227963f0f98', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A23', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Conferir apuração dos honorários', 'Evitar divergências administrativas no início', 'Administrativo', 'Conferir cláusula assinada, período inaugural e base dos recebimentos', 'Financeiro FIQ + João', '2026-11-30', '2026-12-07', 'Honorários conforme contrato assinado',
  'A01 e dados de recebimento', 'Cl. 8 e 9', 'Demonstrativo validado; vencimento conferido', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'e5e62f66-f715-5f6c-823c-461590506589', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A24', 'eac07924-b495-5132-9bae-cc1d33593f20',
  'Revisar efeito das primeiras decisões de caixa', 'Verificar se o risco diminuiu', 'Direção', 'Comparar projeção anterior, realizado e saldo mínimo aprovado', 'João + Izaque', '2026-12-14', '2026-12-21', 'Encontro e análise do ciclo 1',
  'A08 e A09', 'Cl. 3.1 e 3.4', 'Desvios explicados e decisões atualizadas', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '6e82b013-7e92-5ced-9d77-5c69a2b12af6', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A25', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Encerrar primeiro ciclo e pactuar o seguinte', 'Proteger foco e capacidade da assessoria', 'Governança', 'Revisar entregas, pendências, horas e até três prioridades', 'João + Izaque', '2026-12-21', '2026-12-22', 'Total CEO EXPRESS até 20h no ciclo',
  'A21, A22 e A24', 'Cl. 3.3, 6 e 7', 'Registro de aceite e agenda ajustada ao recesso', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '80517111-027b-5486-9045-9e296cbbd3b2', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A26', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Fechar 2026 e reconciliar a DRE gerencial', 'Trocar estimativas por realizados', 'Financeiro', 'Fechar novembro e dezembro; contador valida classificações; equipe concilia', 'Financeiro FIQ', '2027-01-04', '2027-01-15', 'Rotina interna; sem conciliação diária pela assessoria',
  'A10 e disponibilidade contábil', 'Cl. 3.1 e 3.2', 'Diferenças identificadas e relatório fechado ou ressalvado', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '882a31ec-a652-5cc4-a080-b635da20065d', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A27', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Atualizar orçamento de 2027 com o fechamento', 'Corrigir a primeira versão sem esperar o plano de negócios', 'Orçamento', 'Revisar premissas materiais, janeiro e projeções; versionar alterações', 'João + Izaque', '2027-01-15', '2027-01-22', 'Dentro de 20h do ciclo 2',
  'A21 e A26', 'Cl. 3.1', 'Orçamento revisto com decisões aprovadas', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  '845b81e0-3947-56ca-bc08-665896d2f93a', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A28', '26fcf1b9-0862-5e9d-8a6b-a99b22f074a7',
  'Testar orçamento e margem em novos projetos', 'Validar preço e prazo na rotina real', 'Operação e comercial', 'Aplicar critério aprovado e registrar orçamento versus custo realizado', 'Comercial + operação FIQ', '2027-01-04', '2027-01-22', 'Rotina interna',
  'A12, A15 e A21', 'Cl. 3.1 e 4.1', 'Casos comparáveis com desvio e causa documentada', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'a4cc57d0-071a-50c1-a381-90c3ba062bbc', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A29', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Avaliar relação com gráficas e canais', 'Reduzir fricção e selecionar clientes com evidências', 'Modelo de negócios', 'Rever casos reais, origem de contas e limites de contato; validar jurídico se necessário', 'João + Izaque', '2027-01-11', '2027-02-08', 'Dentro de 20h dos ciclos 2 e 3; jurídico a aprovar',
  'A16 e A28', 'Cl. 4.1 e 4.3', 'Regras gerenciais propostas e decisões de posicionamento', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.action_items (id, company_id, project_id, kind, code, objective_id, title, rationale, area, how,
  owner_label, starts_on, due_on, resources, dependency_note, basis, completion_criteria, expected_evidence, status) values (
  'f44ce591-776c-55c2-8806-64a849417073', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'acao_5w2h', 'A30', '6857ffc7-5407-5cb6-bd6e-3b3da1a6d89c',
  'Consolidar diagnóstico e revisão de 90 dias', 'Escolher o próximo trimestre com base nos resultados', 'Governança', 'Rever caixa, margem, processo, orçamento e lacunas; atualizar Canvas e SWOT', 'João + Izaque', '2027-02-15', '2027-02-22', 'Dentro de 20h do ciclo 3',
  'A27 a A29', 'Cl. 3.3 e 3.4', 'Até três prioridades aprovadas para o ciclo seguinte', null, 'a_fazer')
  on conflict (id) do nothing;

insert into public.meetings (id, company_id, project_id, scheduled_on, title, agenda, expected_output) values (
  '25ec3f26-3c8c-598b-89c4-0b9f25f74bbd', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', '2026-11-23', 'Abertura e decisões imediatas', 'Papéis, dados mínimos, prioridades e agenda', 'Ata de abertura')
  on conflict (id) do nothing;

insert into public.milestones (id, company_id, project_id, name, planned_on) values (
  '964fbc6a-7ac9-54cd-9545-ee5c1d0710e7', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'Ata de abertura', '2026-11-23')
  on conflict (id) do nothing;

insert into public.meetings (id, company_id, project_id, scheduled_on, title, agenda, expected_output) values (
  '9000d4c2-e343-5316-9eab-d7cade1fcfa0', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', '2026-11-30', 'Caixa e obrigações', 'Versão inicial, déficit, saldo mínimo e medidas', 'Decisões financeiras')
  on conflict (id) do nothing;

insert into public.milestones (id, company_id, project_id, name, planned_on) values (
  '14da7336-e433-5332-b960-1a9d0f23d99c', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'Decisões financeiras', '2026-11-30')
  on conflict (id) do nothing;

insert into public.meetings (id, company_id, project_id, scheduled_on, title, agenda, expected_output) values (
  'cc2f264c-57d1-57b0-926c-3366d0a0ad0e', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', '2026-12-07', 'Diagnóstico e escolhas', 'DRE preliminar, amostra, causas e premissas', 'Prioridades e premissas')
  on conflict (id) do nothing;

insert into public.milestones (id, company_id, project_id, name, planned_on) values (
  '497e6678-1df1-5bf4-b74b-fe1f20fc8336', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'Prioridades e premissas', '2026-12-07')
  on conflict (id) do nothing;

insert into public.meetings (id, company_id, project_id, scheduled_on, title, agenda, expected_output) values (
  'bc2457c7-7bba-58a9-a9bd-9b4d1e7c16c3', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', '2026-12-14', 'Orçamento preliminar 2027', 'Receita, margem, capacidade, investimentos e caixa', 'Versão para revisão')
  on conflict (id) do nothing;

insert into public.milestones (id, company_id, project_id, name, planned_on) values (
  '9c43e392-e2c1-53c5-856f-80de95ec6640', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'Versão para revisão', '2026-12-14')
  on conflict (id) do nothing;

insert into public.meetings (id, company_id, project_id, scheduled_on, title, agenda, expected_output) values (
  '9ef31e3f-333e-53d0-98b1-c9f88adbf821', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', '2026-12-21', 'Aprovação inicial e revisão mensal', 'Orçamento, pendências e próximo ciclo', 'Registro de aprovação')
  on conflict (id) do nothing;

insert into public.milestones (id, company_id, project_id, name, planned_on) values (
  '3d1cc939-840b-52c0-b236-c9f2dcf9f0da', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'Registro de aprovação', '2026-12-21')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  'b26a15c3-940f-5a71-a5f1-549db22f9301', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R01', 'decisao', 'Aprovar P1 caixa, P2 margem/processo e P3 orçamento', 'Proposta CEO EXPRESS',
  'Izaque', '2026-11-23', 'aguardando', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  '66b43fda-98ff-5345-a638-40e4e7ab80cf', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R02', 'lacuna', 'Conferir via assinada, CNPJ e data de início', 'Última minuta salva ainda contém campos cadastrais',
  'Izaque', '2026-11-23', 'a_apurar', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  'd090abab-96e5-5922-9285-51fa983a4193', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R03', 'hipotese', 'Descasamento entre recebimento e pagamento pode pressionar o caixa', 'Hipótese de diagnóstico; sem números atuais',
  'Financeiro FIQ', '2026-11-30', 'a_apurar', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  'f1eb2289-69de-550a-a1ca-3453cecc9ab4', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R04', 'hipotese', 'Retrabalho ou orçamentos incompletos podem reduzir margem', 'Hipótese a testar na amostra',
  'Operação FIQ', '2026-12-07', 'a_apurar', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  '6dd55f69-7c00-5375-a3e2-803efb01b8e8', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R05', 'decisao', 'Definir saldo mínimo de caixa e gatilho de escalonamento', 'Necessidade prevista no escopo financeiro',
  'Izaque', '2026-11-30', 'aguardando', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  '9a173174-ae10-5a73-a0af-e939f6795bce', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R06', 'premissa', 'Fazer orçamento inicial antes do plano de negócios consolidado', 'Proposta de calendário da CEO EXPRESS',
  'Izaque', '2026-12-07', 'aguardando', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  '9de1d9df-9aac-57cd-8033-8097584f6543', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R07', 'lacuna', 'Validar regime tributário e premissas de 2027', 'Contabilidade ainda não consultada neste trabalho',
  'Contabilidade FIQ', '2026-12-11', 'a_apurar', 'internal')
  on conflict (id) do nothing;

insert into public.decisions (id, company_id, project_id, code, kind, summary, basis, decided_by, due_on, status, visibility) values (
  'c2344705-6450-500a-b76a-c83509e0724b', '48df1e2c-2f01-5d17-a63a-fdd1e158814d', 'd7fc4064-e9e4-5317-8f17-825016b0f6da', 'R08', 'decisao', 'Aprovar orçamento inicial ou registrar impedimentos', 'Depende de dados e cenários',
  'Izaque', '2026-12-21', 'aguardando', 'internal')
  on conflict (id) do nothing;

commit;
