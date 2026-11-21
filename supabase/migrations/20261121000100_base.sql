-- CEOEXPRESS | Gestão Estratégica — esquema base (fase 0)
-- Multiempresa: todo dado de negócio pertence a uma empresa (company_id) e,
-- quando aplicável, a um projeto (project_id). O isolamento é garantido por
-- Row Level Security (RLS) no próprio banco, e não apenas pelas telas.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.platform_role as enum ('admin', 'consultant', 'client');
create type public.company_role as enum ('client_manager', 'client_member', 'client_viewer');
create type public.project_role as enum ('consultant', 'client_manager', 'client_member', 'client_viewer');
create type public.request_status as enum (
  'nao_iniciado', 'em_preenchimento', 'enviado', 'em_analise',
  'complementacao_solicitada', 'aprovado', 'nao_aplicavel'
);
create type public.visibility as enum ('client', 'internal');
create type public.priority as enum ('baixa', 'media', 'alta', 'critica');
create type public.action_status as enum ('a_fazer', 'em_andamento', 'bloqueada', 'concluida', 'cancelada');
create type public.action_kind as enum ('tarefa', 'pendencia', 'acao_5w2h');

-- ---------------------------------------------------------------------------
-- Identidade
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  platform_role public.platform_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  cnpj text unique,
  segment text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role public.company_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null,
  kind text,
  description text,
  starts_on date,
  ends_on date,
  status text not null default 'ativo' check (status in ('planejado', 'ativo', 'pausado', 'encerrado')),
  monthly_hours numeric(6,1),          -- capacidade contratada (horas/mês)
  drive_folder_url text,               -- pasta de referência no Google Drive (sem uso para controle de acesso)
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.projects (company_id);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index on public.project_members (user_id);

-- Convites: o token nunca é guardado em claro, apenas o hash SHA-256.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  platform_role public.platform_role not null default 'client',
  company_id uuid references public.companies (id) on delete cascade,
  company_role public.company_role,
  project_id uuid references public.projects (id) on delete cascade,
  project_role public.project_role,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  revoked_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (project_id is null or project_role is not null),
  check (company_id is null or company_role is not null or platform_role <> 'client')
);

-- ---------------------------------------------------------------------------
-- Solicitações de informações e documentos
-- ---------------------------------------------------------------------------
create table public.info_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null,
  title text not null,
  category text not null,
  stage text,
  assigned_to uuid references public.profiles (id),
  owner_label text,                    -- responsável por extenso enquanto não há usuário vinculado
  due_on date,
  status public.request_status not null default 'nao_iniciado',
  description text,
  purpose text,
  minimum_content text,
  examples text,
  accepted_formats text[] not null default array['pdf'],
  instructions text,
  -- Subitens do pedido, cada um com sua orientação: [{"item": "...", "instrucao": "..."}]
  checklist jsonb not null default '[]'::jsonb,
  visibility public.visibility not null default 'client',
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);
create index on public.info_requests (project_id, status);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  info_request_id uuid references public.info_requests (id) on delete set null,
  action_item_id uuid,
  title text not null,
  folder text not null default '01_DOCUMENTOS_INSTITUCIONAIS',
  origin text not null default 'cliente' check (origin in ('cliente', 'consultoria', 'drive')),
  visibility public.visibility not null default 'client',
  deleted_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.documents (project_id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null,
  -- Dados do envio herdados do portal original
  period text,                         -- período a que a informação se refere
  source text,                         -- sistema ou fonte de origem
  comment text,                        -- descrição do envio
  checklist_items text[] not null default '{}', -- subitens atendidos por este arquivo
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

-- ---------------------------------------------------------------------------
-- Execução e governança
-- ---------------------------------------------------------------------------
-- Objetivos ou prioridades estratégicas do projeto (ex.: P1 Caixa e obrigações)
-- com quem decide, o que é preciso para decidir e como verificar o resultado.
create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null,
  name text not null,
  who_decides text,
  decision_inputs text,
  verification text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.action_kind not null default 'tarefa',
  code text,
  objective_id uuid references public.objectives (id) on delete set null,
  title text not null,                 -- O que precisa ser realizado?
  rationale text,                      -- Por que precisa ser realizado?
  area text,                           -- Onde
  how text,                            -- Como
  strategic_objective text,
  priority public.priority not null default 'media',
  executor_id uuid references public.profiles (id),   -- Quem executa?
  owner_label text,                    -- executor por extenso, antes de haver usuário
  approver_id uuid references public.profiles (id),   -- Quem decide?
  decision_inputs text,                -- Quais informações são necessárias?
  starts_on date,
  due_on date,                         -- Quando deve ser concluído?
  resources text,                      -- Quanto custa / recursos
  dependency_note text,
  basis text,                          -- base contratual ou referência
  expected_evidence text,              -- Como será comprovado o resultado?
  completion_criteria text,
  status public.action_status not null default 'a_fazer',
  visibility public.visibility not null default 'client',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.action_items (project_id, status);

alter table public.documents
  add constraint documents_action_item_fk foreign key (action_item_id)
  references public.action_items (id) on delete set null;

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  planned_on date not null,
  achieved_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  scheduled_on date not null,
  start_time time,                     -- horário, quando definido
  held boolean not null default false,
  title text not null,
  agenda text,
  expected_output text,
  minutes text,
  visibility public.visibility not null default 'client',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete set null,
  code text,
  kind text not null default 'decisao' check (kind in ('decisao', 'lacuna', 'hipotese', 'premissa')),
  summary text not null,
  basis text,
  decided_by text,                     -- quem decide ou apura
  due_on date,
  status text not null default 'aguardando' check (status in ('aguardando', 'a_apurar', 'aprovada', 'rejeitada', 'resolvida')),
  decided_on date,
  visibility public.visibility not null default 'client',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  target_type text not null check (target_type in ('info_request', 'action_item', 'document')),
  target_id uuid not null,
  body text not null check (length(body) between 1 and 5000),
  visibility public.visibility not null default 'client',
  author_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.comments (target_type, target_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  link text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, read_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  company_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb
);
create index on public.audit_log (company_id, occurred_at desc);
