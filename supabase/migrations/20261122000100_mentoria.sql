-- CEOEXPRESS | Gestão Estratégica — módulo de Mentoria (fase 1)
--
-- 1. companies.person_kind: marca o cadastro como pessoa jurídica (pj) ou
--    pessoa física (pf). Mentorados sem empresa viram um cadastro "pf".
-- 2. assessment_applications: cada aplicação de uma avaliação a um mentorado.
--    O conteúdo das avaliações (perguntas, dimensões, textos) fica no código,
--    com número de versão; aqui ficam respostas, notas e o andamento.
--    O mentorado responde por um link pessoal sem login: o banco guarda só o
--    hash do token, e as gravações pelo link passam pelo servidor, que confere
--    o token antes de usar a chave de serviço. Nenhum acesso anônimo direto.
--    Respostas de autoconhecimento são dado pessoal: só a consultoria vê; o
--    mentorado vê apenas o que foi liberado para ele; o gestor da empresa não vê.
-- 3. mentoring_library: biblioteca de livros e filmes ligados às dimensões
--    das avaliações. Genérica, editada pelo administrador.

-- ---------------------------------------------------------------------------
-- 1. Pessoa física ou jurídica
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists person_kind text not null default 'pj' check (person_kind in ('pj', 'pf'));

-- ---------------------------------------------------------------------------
-- 2. Aplicações de avaliações
-- ---------------------------------------------------------------------------
create table public.assessment_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  instrument text not null check (instrument in (
    'roda_vida', 'ie_lideranca', 'barreiras_mudanca', 'armadilhas_decisao',
    'perfil_empreendedor', 'mente_a_favor', 'externo'
  )),
  instrument_version integer not null default 1,
  -- "link": respondida pelo mentorado; "externo": resultado de teste de
  -- terceiros digitado pelo mentor; "importado": notas antigas digitadas.
  source text not null default 'link' check (source in ('link', 'externo', 'importado')),
  title text check (title is null or length(title) between 1 and 200),
  respondent_name text not null check (length(respondent_name) between 1 and 200),
  respondent_email text check (respondent_email is null or length(respondent_email) <= 320),
  -- Conta do mentorado no app (opcional): só ela vê o relatório liberado.
  respondent_id uuid references public.profiles (id) on delete set null,
  token_hash text unique,
  expires_at timestamptz,
  status text not null default 'enviado' check (status in ('enviado', 'em_andamento', 'respondido', 'cancelado')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 100000),
  scores jsonb check (scores is null or (jsonb_typeof(scores) = 'object' and pg_column_size(scores) < 100000)),
  -- Teste externo: {"principal": {"rotulo","valor","maximo"}, "itens": [{"rotulo","valor","maximo"}], "link": "..."}
  external jsonb check (external is null or (jsonb_typeof(external) = 'object' and pg_column_size(external) < 50000)),
  applied_on date,
  consent_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  mentor_comment text check (mentor_comment is null or length(mentor_comment) <= 20000),
  released_at timestamptz,
  released_by uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_liberar_so_respondida check (released_at is null or status = 'respondido'),
  constraint assessment_link_so_para_resposta check (token_hash is null or source = 'link'),
  constraint assessment_externo_coerente check ((instrument = 'externo') = (source = 'externo'))
);
create index on public.assessment_applications (project_id, created_at desc);
create index on public.assessment_applications (respondent_id);

create trigger assessment_applications_company before insert or update of project_id on public.assessment_applications
  for each row execute function public.sync_company_from_project();
create trigger assessment_applications_touch before update on public.assessment_applications
  for each row execute function public.touch_updated_at();
-- Auditoria só dos marcos (criação, resposta, liberação, exclusão), não de cada rascunho salvo.
create trigger assessment_applications_audit_ins_del after insert or delete on public.assessment_applications
  for each row execute function public.write_audit();
create trigger assessment_applications_audit_upd after update of status, released_at, respondent_id on public.assessment_applications
  for each row execute function public.write_audit();

alter table public.assessment_applications enable row level security;

create policy assessment_select on public.assessment_applications for select to authenticated
  using (
    public.is_project_staff(project_id)
    or (released_at is not null and respondent_id = auth.uid() and public.can_access_project(project_id))
  );
create policy assessment_staff on public.assessment_applications for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

grant select, insert, update, delete on public.assessment_applications to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Biblioteca de livros e filmes
-- ---------------------------------------------------------------------------
create table public.mentoring_library (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('livro', 'filme')),
  title text not null check (length(title) between 1 and 300),
  author text check (author is null or length(author) <= 300),
  year integer check (year is null or year between 1000 and 2100),
  -- "<avaliação>:<dimensão>" (ex.: "ie_lideranca:empatia") ou "tema:<tema>".
  tags text[] not null default '{}',
  note text check (note is null or length(note) <= 2000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, title)
);
create index on public.mentoring_library using gin (tags);

create trigger mentoring_library_touch before update on public.mentoring_library
  for each row execute function public.touch_updated_at();

alter table public.mentoring_library enable row level security;

-- Conteúdo genérico (títulos e autores): qualquer usuário logado lê, para o
-- mentorado ver as leituras sugeridas no relatório liberado.
create policy mentoring_library_read on public.mentoring_library for select to authenticated
  using (active or public.is_consultancy());
create policy mentoring_library_admin on public.mentoring_library for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.mentoring_library to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.assessment_applications, public.mentoring_library to service_role;
  end if;
end $$;

-- Acervo inicial (pode ser editado pelo administrador no app).
insert into public.mentoring_library (kind, title, author, year, tags) values
  ('livro', 'Em Busca de Sentido', 'Viktor Frankl', null, array['roda_vida:carreira','roda_vida:espiritualidade','barreiras_mudanca:meta_vaga']),
  ('livro', 'Comece pelo Porquê', 'Simon Sinek', null, array['roda_vida:carreira']),
  ('livro', 'Essencialismo', 'Greg McKeown', null, array['roda_vida:lazer','roda_vida:emocional']),
  ('livro', 'O Milagre da Manhã', 'Hal Elrod', null, array['roda_vida:saude']),
  ('livro', 'Por Que Nós Dormimos', 'Matthew Walker', null, array['roda_vida:saude']),
  ('livro', 'Pai Rico, Pai Pobre', 'Robert Kiyosaki', null, array['roda_vida:financas']),
  ('livro', 'O Homem Mais Rico da Babilônia', 'George S. Clason', null, array['roda_vida:financas']),
  ('livro', 'Pense e Enriqueça', 'Napoleon Hill', null, array['roda_vida:financas','roda_vida:carreira']),
  ('livro', 'As Cinco Linguagens do Amor', 'Gary Chapman', null, array['roda_vida:amoroso','roda_vida:familia']),
  ('livro', 'Felicidade Autêntica', 'Martin Seligman', null, array['roda_vida:realizacao']),
  ('livro', 'Inteligência Emocional', 'Daniel Goleman', null, array['ie_lideranca:autoconsciencia','ie_lideranca:autogestao','ie_lideranca:automotivacao','ie_lideranca:empatia','ie_lideranca:relacionamentos']),
  ('livro', 'Agilidade Emocional', 'Susan David', null, array['ie_lideranca:autogestao','ie_lideranca:autoconsciencia','mente_a_favor:catastrofizar','mente_a_favor:deveria']),
  ('livro', 'Comunicação Não-Violenta', 'Marshall Rosenberg', null, array['ie_lideranca:empatia','ie_lideranca:relacionamentos']),
  ('livro', 'Conversas Difíceis', 'Douglas Stone, Bruce Patton e Sheila Heen', null, array['ie_lideranca:relacionamentos','ie_lideranca:autogestao']),
  ('livro', 'Garra', 'Angela Duckworth', null, array['ie_lideranca:automotivacao','perfil_empreendedor:persistencia','perfil_empreendedor:metas']),
  ('livro', 'Motivação 3.0', 'Daniel H. Pink', null, array['ie_lideranca:automotivacao']),
  ('livro', 'O Poder dos Quietos', 'Susan Cain', null, array['ie_lideranca:autoconsciencia','ie_lideranca:relacionamentos']),
  ('livro', 'A Coragem de Ser Imperfeito', 'Brené Brown', null, array['ie_lideranca:autoconsciencia','ie_lideranca:empatia','barreiras_mudanca:isolamento','mente_a_favor:desconsiderar','mente_a_favor:rotular']),
  ('livro', 'Empatia Assertiva (Radical Candor)', 'Kim Scott', null, array['ie_lideranca:relacionamentos','ie_lideranca:empatia']),
  ('livro', 'Hábitos Atômicos', 'James Clear', null, array['barreiras_mudanca:habitos','barreiras_mudanca:saber_sem_fazer','armadilhas_decisao:adiar']),
  ('livro', 'O Poder do Hábito', 'Charles Duhigg', null, array['barreiras_mudanca:habitos','perfil_empreendedor:planejamento']),
  ('livro', 'Mindset', 'Carol Dweck', null, array['barreiras_mudanca:crencas','barreiras_mudanca:apego','mente_a_favor:rotular','mente_a_favor:tudo_ou_nada']),
  ('livro', 'Quem Mexeu no Meu Queijo?', 'Spencer Johnson', null, array['barreiras_mudanca:apego','barreiras_mudanca:prontidao']),
  ('livro', 'Switch: Como Mudar as Coisas Quando a Mudança É Difícil', 'Chip Heath e Dan Heath', null, array['barreiras_mudanca:meta_vaga','barreiras_mudanca:ambiente']),
  ('livro', 'A Única Coisa', 'Gary Keller e Jay Papasan', null, array['barreiras_mudanca:meta_vaga','barreiras_mudanca:saber_sem_fazer']),
  ('livro', 'Os 7 Hábitos das Pessoas Altamente Eficazes', 'Stephen R. Covey', null, array['barreiras_mudanca:saber_sem_fazer','barreiras_mudanca:prontidao','tema:lideranca']),
  ('livro', 'Poder Sem Limites', 'Tony Robbins', null, array['barreiras_mudanca:crencas']),
  ('livro', 'Rápido e Devagar', 'Daniel Kahneman', null, array['armadilhas_decisao:adiar','armadilhas_decisao:excesso_confianca','armadilhas_decisao:confirmacao','armadilhas_decisao:medo_perder','armadilhas_decisao:custo_afundado','armadilhas_decisao:manada','armadilhas_decisao:emocao','tema:lideranca']),
  ('livro', 'Previsivelmente Irracional', 'Dan Ariely', null, array['armadilhas_decisao:medo_perder','armadilhas_decisao:manada']),
  ('livro', 'Nudge', 'Richard Thaler e Cass Sunstein', null, array['armadilhas_decisao:manada','armadilhas_decisao:adiar']),
  ('livro', 'Pensar em Apostas (Thinking in Bets)', 'Annie Duke', null, array['armadilhas_decisao:excesso_confianca','armadilhas_decisao:custo_afundado']),
  ('livro', 'Gente que Resolve (Decisive)', 'Chip Heath e Dan Heath', null, array['armadilhas_decisao:confirmacao','armadilhas_decisao:emocao']),
  ('livro', 'Ruído', 'Daniel Kahneman, Olivier Sibony e Cass Sunstein', null, array['armadilhas_decisao:excesso_confianca']),
  ('livro', 'A Lógica do Cisne Negro', 'Nassim Nicholas Taleb', null, array['armadilhas_decisao:excesso_confianca']),
  ('livro', 'As Armas da Persuasão', 'Robert Cialdini', null, array['armadilhas_decisao:manada','perfil_empreendedor:influencia']),
  ('livro', 'Superprevisões', 'Philip Tetlock e Dan Gardner', null, array['armadilhas_decisao:confirmacao','armadilhas_decisao:excesso_confianca']),
  ('livro', 'A Startup Enxuta', 'Eric Ries', null, array['perfil_empreendedor:oportunidades','perfil_empreendedor:risco_calculado']),
  ('livro', 'De Zero a Um', 'Peter Thiel', null, array['perfil_empreendedor:oportunidades']),
  ('livro', 'A Vaca Roxa', 'Seth Godin', null, array['perfil_empreendedor:oportunidades','perfil_empreendedor:qualidade']),
  ('livro', 'Vender É Humano', 'Daniel H. Pink', null, array['perfil_empreendedor:influencia']),
  ('livro', 'Como Fazer Amigos e Influenciar Pessoas', 'Dale Carnegie', null, array['perfil_empreendedor:influencia','roda_vida:social']),
  ('livro', 'A Marca da Vitória', 'Phil Knight', null, array['perfil_empreendedor:persistencia','perfil_empreendedor:iniciativa']),
  ('livro', 'O Mito do Empreendedor', 'Michael E. Gerber', null, array['perfil_empreendedor:planejamento']),
  ('livro', 'Empresas Feitas para Vencer', 'Jim Collins', null, array['perfil_empreendedor:metas','perfil_empreendedor:qualidade']),
  ('livro', 'Sonho Grande', 'Cristiane Correa', null, array['perfil_empreendedor:metas','perfil_empreendedor:qualidade']),
  ('livro', 'Gestão de Alta Performance', 'Andrew S. Grove', null, array['perfil_empreendedor:planejamento']),
  ('livro', 'Avalie o Que Importa', 'John Doerr', null, array['perfil_empreendedor:metas','perfil_empreendedor:planejamento']),
  ('livro', 'Inteligência Positiva', 'Shirzad Chamine', null, array['mente_a_favor:indice']),
  ('livro', 'Praticando o Poder do Agora', 'Eckhart Tolle', null, array['mente_a_favor:catastrofizar','mente_a_favor:indice','roda_vida:emocional']),
  ('livro', 'Os Quatro Compromissos', 'Don Miguel Ruiz', null, array['mente_a_favor:adivinhar','mente_a_favor:personalizar']),
  ('livro', 'Aprenda a Ser Otimista', 'Martin Seligman', null, array['mente_a_favor:generalizar','mente_a_favor:personalizar']),
  ('livro', 'A Sutil Arte de Ligar o F*da-se', 'Mark Manson', null, array['mente_a_favor:deveria','mente_a_favor:rotular']),
  ('livro', 'Atenção Plena (Mindfulness)', 'Mark Williams e Danny Penman', null, array['mente_a_favor:catastrofizar','mente_a_favor:indice']),
  ('livro', 'O Monge e o Executivo', 'James C. Hunter', null, array['tema:lideranca']),
  ('livro', 'Líderes Se Servem por Último', 'Simon Sinek', null, array['tema:lideranca']),
  ('livro', 'Os 5 Desafios das Equipes', 'Patrick Lencioni', null, array['tema:lideranca','ie_lideranca:relacionamentos']),
  ('livro', 'A Arte da Guerra', 'Sun Tzu', null, array['tema:lideranca']),
  ('livro', 'Obrigado pelo Feedback', 'Douglas Stone e Sheila Heen', null, array['tema:lideranca','ie_lideranca:relacionamentos']),
  ('livro', 'Conversas Cruciais', 'Kerry Patterson e outros', null, array['tema:lideranca','ie_lideranca:relacionamentos']),
  ('livro', 'Multiplicadores', 'Liz Wiseman', null, array['tema:lideranca']),
  ('livro', 'O Gerente-Minuto', 'Ken Blanchard e Spencer Johnson', null, array['tema:lideranca']),
  ('filme', 'À Procura da Felicidade', 'Gabriele Muccino', 2006, array['roda_vida:financas','roda_vida:carreira']),
  ('filme', 'Antes de Partir', 'Rob Reiner', 2007, array['roda_vida:realizacao','roda_vida:social']),
  ('filme', 'A Vida Secreta de Walter Mitty', 'Ben Stiller', 2013, array['roda_vida:lazer','roda_vida:realizacao']),
  ('filme', 'Click', 'Frank Coraci', 2006, array['roda_vida:familia','roda_vida:emocional']),
  ('filme', 'Comer, Rezar, Amar', 'Ryan Murphy', 2010, array['roda_vida:espiritualidade','roda_vida:emocional']),
  ('filme', 'Patch Adams', 'Tom Shadyac', 1998, array['roda_vida:contribuicao']),
  ('filme', 'Sociedade dos Poetas Mortos', 'Peter Weir', 1989, array['roda_vida:intelectual','roda_vida:carreira']),
  ('filme', 'Invictus', 'Clint Eastwood', 2009, array['ie_lideranca:autogestao','ie_lideranca:relacionamentos','tema:lideranca']),
  ('filme', 'O Discurso do Rei', 'Tom Hooper', 2010, array['ie_lideranca:autoconsciencia','ie_lideranca:autogestao','barreiras_mudanca:isolamento','barreiras_mudanca:crencas','tema:lideranca']),
  ('filme', 'Divertida Mente', 'Pete Docter', 2015, array['ie_lideranca:autoconsciencia','roda_vida:emocional','mente_a_favor:indice']),
  ('filme', 'Gênio Indomável', 'Gus Van Sant', 1997, array['ie_lideranca:autoconsciencia','ie_lideranca:empatia']),
  ('filme', 'Intocáveis', 'Olivier Nakache e Éric Toledano', 2011, array['ie_lideranca:empatia','ie_lideranca:relacionamentos']),
  ('filme', 'Estrelas Além do Tempo', 'Theodore Melfi', 2016, array['ie_lideranca:automotivacao','ie_lideranca:autogestao']),
  ('filme', 'Feitiço do Tempo', 'Harold Ramis', 1993, array['barreiras_mudanca:habitos','barreiras_mudanca:prontidao','mente_a_favor:generalizar','mente_a_favor:indice']),
  ('filme', 'Sim Senhor', 'Peyton Reed', 2008, array['barreiras_mudanca:prontidao','barreiras_mudanca:apego']),
  ('filme', 'Um Senhor Estagiário', 'Nancy Meyers', 2015, array['barreiras_mudanca:apego','barreiras_mudanca:ambiente']),
  ('filme', 'Rocky Balboa', 'Sylvester Stallone', 2006, array['barreiras_mudanca:crencas','barreiras_mudanca:saber_sem_fazer']),
  ('filme', 'Doze Homens e uma Sentença', 'Sidney Lumet', 1957, array['armadilhas_decisao:manada','armadilhas_decisao:confirmacao']),
  ('filme', 'O Homem que Mudou o Jogo', 'Bennett Miller', 2011, array['armadilhas_decisao:confirmacao']),
  ('filme', 'A Grande Aposta', 'Adam McKay', 2015, array['armadilhas_decisao:manada','armadilhas_decisao:excesso_confianca']),
  ('filme', 'Margin Call: O Dia Antes do Fim', 'J. C. Chandor', 2011, array['armadilhas_decisao:emocao','armadilhas_decisao:medo_perder']),
  ('filme', 'Sully: O Herói do Rio Hudson', 'Clint Eastwood', 2016, array['armadilhas_decisao:emocao']),
  ('filme', 'Fome de Poder', 'John Lee Hancock', 2016, array['perfil_empreendedor:oportunidades','perfil_empreendedor:iniciativa']),
  ('filme', 'Joy: O Nome do Sucesso', 'David O. Russell', 2015, array['perfil_empreendedor:persistencia','perfil_empreendedor:autoconfianca']),
  ('filme', 'A Rede Social', 'David Fincher', 2010, array['perfil_empreendedor:oportunidades','perfil_empreendedor:risco_calculado']),
  ('filme', 'Steve Jobs', 'Danny Boyle', 2015, array['perfil_empreendedor:qualidade']),
  ('filme', 'Piratas do Vale do Silício', 'Martyn Burke', 1999, array['perfil_empreendedor:informacao','perfil_empreendedor:influencia']),
  ('filme', 'O Menino que Descobriu o Vento', 'Chiwetel Ejiofor', 2019, array['perfil_empreendedor:iniciativa','perfil_empreendedor:informacao']),
  ('filme', 'Uma Mente Brilhante', 'Ron Howard', 2001, array['mente_a_favor:adivinhar']),
  ('filme', 'Soul', 'Pete Docter', 2020, array['mente_a_favor:tudo_ou_nada','mente_a_favor:desconsiderar']),
  ('filme', 'O Lado Bom da Vida', 'David O. Russell', 2012, array['mente_a_favor:rotular','mente_a_favor:generalizar']),
  ('filme', 'Apollo 13', 'Ron Howard', 1995, array['tema:lideranca']),
  ('filme', 'Duelo de Titãs', 'Boaz Yakin', 2000, array['tema:lideranca']),
  ('filme', 'Coach Carter', 'Thomas Carter', 2005, array['tema:lideranca']),
  ('filme', 'O Lobo de Wall Street', 'Martin Scorsese', 2013, array['tema:lideranca'])
on conflict (kind, title) do nothing;
