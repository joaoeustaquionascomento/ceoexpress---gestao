-- CEOEXPRESS | Gestão Estratégica — modelos separados por tipo de serviço
--
-- Os modelos de pedidos e de ações passam a dizer para que serviço servem:
-- 'empresa' (consultoria para empresas, os que já existiam) ou 'mentoria'.
-- Ao montar um projeto do tipo Mentoria, só aparecem os modelos de mentoria.
-- O mesmo código (PI-01, AP-01) pode existir nos dois tipos.

alter table public.request_templates
  add column service text not null default 'empresa' check (service in ('empresa', 'mentoria'));
alter table public.action_templates
  add column service text not null default 'empresa' check (service in ('empresa', 'mentoria'));

alter table public.request_templates drop constraint request_templates_code_key;
alter table public.action_templates drop constraint action_templates_code_key;
alter table public.request_templates add constraint request_templates_service_code_key unique (service, code);
alter table public.action_templates add constraint action_templates_service_code_key unique (service, code);

-- Copiar de um projeto existente: os modelos ficam no tipo do projeto.
create or replace function public.import_templates_from_project(p_project uuid)
returns table (requests int, actions int)
language plpgsql security definer set search_path = public as $$
declare
  v_req int;
  v_act int;
  v_service text;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Só o administrador edita a biblioteca de modelos';
  end if;

  select case when kind ~* 'mentoria' then 'mentoria' else 'empresa' end into v_service
  from projects where id = p_project;
  v_service := coalesce(v_service, 'empresa');

  insert into request_templates (service, code, title, category, stage, description, purpose, minimum_content,
                                 examples, accepted_formats, instructions, checklist, sort_order)
  select v_service, code, title, category, stage, description, purpose, minimum_content,
         examples, accepted_formats, instructions, checklist, sort_order
  from info_requests
  where project_id = p_project
  on conflict (service, code) do nothing;
  get diagnostics v_req = row_count;

  insert into action_templates (service, code, kind, title, rationale, area, how, priority, decision_inputs,
                                resources, expected_evidence, completion_criteria, basis, sort_order)
  select v_service, code, kind, title, rationale, area, how, priority, decision_inputs,
         resources, expected_evidence, completion_criteria, basis,
         (row_number() over (order by code, created_at))::int
  from action_items
  where project_id = p_project and code is not null and visibility = 'client'
  on conflict (service, code) do nothing;
  get diagnostics v_act = row_count;

  return query select v_req, v_act;
end;
$$;

revoke all on function public.import_templates_from_project(uuid) from public;
grant execute on function public.import_templates_from_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Modelos de mentoria (genéricos, para qualquer mentorado)
-- ---------------------------------------------------------------------------
insert into public.request_templates (service, code, title, category, description, purpose, minimum_content,
  accepted_formats, instructions, checklist, sort_order) values
('mentoria', 'PI-01', 'Contrato de mentoria e dados cadastrais', 'Início da mentoria',
  'Contrato de mentoria assinado e dados para cadastro e cobrança.',
  'Confirma escopo, número de sessões, vigência e dados de quem contrata.',
  'Contrato assinado por inteiro e dados de contato atualizados.',
  array['pdf','docx','doc','png','jpg','jpeg'],
  '1. Clique em "Enviar arquivo" e selecione o arquivo.
2. Marque os subitens que o arquivo atende e confirme o envio.
3. "Enviado" quer dizer recebido. O mentor confere e aprova ou pede complemento.',
  '[{"item":"Contrato de mentoria assinado","instrucao":"Envie a via assinada completa, até a página das assinaturas."},{"item":"Dados para cadastro e cobrança","instrucao":"Nome completo, CPF ou CNPJ de quem paga, endereço, e-mail e telefone."}]'::jsonb, 1),
('mentoria', 'PI-02', 'Trajetória profissional', 'Quem é você',
  'Currículo ou resumo da carreira: formação, empresas, cargos e principais resultados.',
  'Ajuda o mentor a entender de onde você vem e que experiências já tem.',
  'Formação, experiências com período e cargo, e três conquistas de que você se orgulha.',
  array['pdf','docx','doc','txt'],
  '1. Pode ser o currículo que você já tem ou um texto livre.
2. Clique em "Enviar arquivo" e confirme o envio.',
  '[{"item":"Currículo ou resumo da carreira","instrucao":"Formação, empresas, cargos e períodos."},{"item":"Três conquistas marcantes","instrucao":"O que você fez, o resultado e o que aprendeu com cada uma."}]'::jsonb, 2),
('mentoria', 'PI-03', 'Objetivos e expectativas da mentoria', 'Quem é você',
  'O que você quer alcançar com a mentoria e como vai saber que deu certo.',
  'Define o foco das sessões e o ponto de partida para medir a evolução.',
  'Até três objetivos, por que cada um importa agora e o que muda na prática se der certo.',
  array['pdf','docx','doc','txt'],
  '1. Escreva com suas palavras, sem se preocupar com formato.
2. Clique em "Enviar arquivo" e confirme o envio.',
  '[{"item":"Até três objetivos","instrucao":"Escreva cada objetivo em uma frase."},{"item":"Como saber que deu certo","instrucao":"Para cada objetivo, diga o que você ou outras pessoas vão perceber de diferente."},{"item":"O que já tentou","instrucao":"Conte o que já fez a respeito e o que atrapalhou."}]'::jsonb, 3),
('mentoria', 'PI-04', 'Resultados de avaliações anteriores', 'Autoconhecimento',
  'Relatórios de testes de perfil, comportamento ou liderança que você já fez.',
  'Evita repetir o que já se sabe e permite comparar com as avaliações da mentoria.',
  'Relatório completo de cada teste, com a data em que foi feito.',
  array['pdf','png','jpg','jpeg'],
  '1. Envie um arquivo por teste. Se não fez nenhum, avise o mentor e este pedido é dispensado.
2. Clique em "Enviar arquivo" e confirme o envio.',
  '[{"item":"Relatórios de testes já feitos","instrucao":"Envie o relatório inteiro, não só a página do resumo."},{"item":"Data de cada teste","instrucao":"Informe quando cada teste foi feito."}]'::jsonb, 4),
('mentoria', 'PI-05', 'Feedbacks recebidos', 'Autoconhecimento',
  'Avaliações de desempenho, feedback 360° ou comentários que você recebeu de líderes, pares ou equipe.',
  'Mostra como os outros percebem você e complementa a sua autoavaliação.',
  'Os feedbacks mais recentes, de preferência dos últimos dois anos.',
  array['pdf','docx','doc','txt','png','jpg','jpeg'],
  '1. Pode ser o documento oficial ou um resumo escrito por você.
2. Clique em "Enviar arquivo" e confirme o envio.',
  '[{"item":"Avaliações de desempenho ou 360°","instrucao":"Envie as mais recentes que tiver."},{"item":"Pontos que se repetem","instrucao":"Escreva o que você mais ouve como ponto forte e como ponto a melhorar."}]'::jsonb, 5),
('mentoria', 'PI-06', 'Rotina e agenda da semana', 'Rotina',
  'Como é uma semana típica: compromissos, horários, reuniões e tempo para você.',
  'Ajuda a encontrar espaço para as práticas e a enxergar onde o tempo vai.',
  'Uma semana real da agenda, com trabalho, família, saúde e descanso.',
  array['pdf','xlsx','xls','png','jpg','jpeg','txt'],
  '1. Pode ser um print da agenda ou uma tabela simples.
2. Clique em "Enviar arquivo" e confirme o envio.',
  '[{"item":"Agenda de uma semana típica","instrucao":"Mostre os compromissos de segunda a domingo."},{"item":"O que mais consome energia","instrucao":"Marque as atividades que mais cansam e as que mais dão energia."}]'::jsonb, 6),
('mentoria', 'PI-07', 'Contexto do trabalho atual', 'Contexto',
  'Onde você atua hoje: empresa, cargo, equipe, a quem responde e os principais desafios.',
  'Situa os objetivos da mentoria na realidade do seu trabalho.',
  'Cargo, tamanho da equipe, principais responsabilidades e os três maiores desafios do momento.',
  array['pdf','docx','doc','txt','png','jpg','jpeg'],
  '1. Pode incluir um organograma, se tiver.
2. Clique em "Enviar arquivo" e confirme o envio.',
  '[{"item":"Cargo e responsabilidades","instrucao":"O que você entrega e por que responde."},{"item":"Equipe e relações","instrucao":"Quem você lidera, a quem responde e com quem mais interage."},{"item":"Três maiores desafios","instrucao":"O que mais preocupa hoje no trabalho."}]'::jsonb, 7);

insert into public.action_templates (service, code, kind, title, rationale, area, how, priority,
  expected_evidence, completion_criteria, sort_order) values
('mentoria', 'AP-01', 'tarefa', 'Assinar o contrato e marcar a primeira sessão', 'Formaliza a mentoria e garante a data de início.', 'Início',
  'Assinar o contrato, enviar os dados cadastrais e combinar data e horário da sessão de abertura.', 'alta',
  'Contrato assinado e sessão de abertura na agenda.', 'Contrato recebido e data confirmada pelos dois.', 1),
('mentoria', 'AP-02', 'acao_5w2h', 'Sessão de abertura: objetivos, combinados e agenda', 'Alinha expectativas e define como a mentoria vai funcionar.', 'Sessões',
  'Conversar sobre trajetória e objetivos, combinar frequência, canal de contato, sigilo e o que fazer entre as sessões.', 'alta',
  'Resumo da sessão com objetivos e combinados.', 'Objetivos e agenda das sessões registrados no app.', 2),
('mentoria', 'AP-03', 'tarefa', 'Responder às avaliações iniciais', 'Cria o ponto de partida para medir a evolução.', 'Autoconhecimento',
  'Responder pelo link às avaliações enviadas pelo mentor, com calma e num momento tranquilo.', 'alta',
  'Avaliações com status Respondido.', 'Todas as avaliações iniciais respondidas.', 3),
('mentoria', 'AP-04', 'acao_5w2h', 'Devolutiva das avaliações e escolha das prioridades', 'Transforma os resultados em foco de trabalho.', 'Sessões',
  'Ler os relatórios juntos, conversar sobre o que surpreendeu e escolher até três prioridades de desenvolvimento.', 'alta',
  'Relatórios liberados e prioridades registradas.', 'Até três prioridades escolhidas e anotadas.', 4),
('mentoria', 'AP-05', 'acao_5w2h', 'Definir metas de desenvolvimento para 90 dias', 'Dá direção e prazo ao que foi escolhido.', 'Plano',
  'Para cada prioridade, escrever uma meta concreta, como medir e o primeiro passo.', 'alta',
  'Metas escritas com indicador e prazo.', 'Metas revisadas e aceitas pelo mentorado.', 5),
('mentoria', 'AP-06', 'acao_5w2h', 'Plano de prática semanal', 'A mudança acontece na rotina, entre as sessões.', 'Plano',
  'Escolher um ou dois hábitos pequenos por semana, combinar quando praticar e registrar como foi.', 'media',
  'Registro semanal das práticas.', 'Quatro semanas seguidas com registro.', 6),
('mentoria', 'AP-07', 'tarefa', 'Leitura ou filme da trilha e reflexão escrita', 'Amplia o repertório sobre o tema que está sendo trabalhado.', 'Desenvolvimento',
  'Escolher um item sugerido no relatório, ler ou assistir e escrever o que aprendeu e o que vai aplicar.', 'media',
  'Reflexão escrita enviada ao mentor.', 'Reflexão conversada na sessão seguinte.', 7),
('mentoria', 'AP-08', 'tarefa', 'Pedir feedback a três pessoas de confiança', 'Compara a autopercepção com a visão de quem convive com você.', 'Desenvolvimento',
  'Escolher três pessoas, fazer duas perguntas simples (o que devo continuar e o que devo mudar) e anotar as respostas sem rebater.', 'media',
  'Respostas anotadas.', 'Feedbacks conversados na sessão.', 8),
('mentoria', 'AP-09', 'acao_5w2h', 'Revisão de meio do ciclo', 'Confere se o caminho está funcionando e ajusta o plano.', 'Sessões',
  'Rever metas e práticas, ver o que avançou e o que travou, e ajustar o que for preciso.', 'media',
  'Plano ajustado.', 'Metas e práticas atualizadas no app.', 9),
('mentoria', 'AP-10', 'tarefa', 'Reaplicar as avaliações e comparar', 'Mostra a evolução com números.', 'Autoconhecimento',
  'Responder de novo às mesmas avaliações e ver o comparativo com a aplicação anterior.', 'media',
  'Relatórios com comparação liberados.', 'Avaliações reaplicadas e comparativo conversado.', 10),
('mentoria', 'AP-11', 'acao_5w2h', 'Encerramento: balanço e próximos passos', 'Consolida o que foi conquistado e o que segue.', 'Sessões',
  'Comparar o ponto de partida com o de chegada, registrar aprendizados e definir como manter as práticas.', 'media',
  'Balanço final escrito.', 'Sessão de encerramento feita e próximos passos registrados.', 11);
