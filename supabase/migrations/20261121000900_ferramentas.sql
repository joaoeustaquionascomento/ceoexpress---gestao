-- CEOEXPRESS | Gestão Estratégica — ferramentas de gestão por projeto
--
-- Cada ferramenta (SWOT, GUT, 5 Porquês, Ishikawa, Pareto e as próximas)
-- é um registro do projeto com o conteúdo em JSON. A consultoria cria e
-- edita; o cliente vê as que forem compartilhadas (visibilidade "client").
-- Ações geradas a partir de uma ferramenta guardam a origem em source_tool_id.

create table public.strategy_tools (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'swot', 'gut', 'cinco_porques', 'ishikawa', 'pareto',
    'canvas', 'bsc', 'okr', 'pdca', 'eisenhower', 'pestel', 'porter'
  )),
  title text not null check (length(title) between 1 and 200),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  notes text check (length(notes) <= 10000),
  visibility public.visibility not null default 'internal',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.strategy_tools (project_id, kind);

create trigger strategy_tools_company before insert or update of project_id on public.strategy_tools
  for each row execute function public.sync_company_from_project();
create trigger strategy_tools_touch before update on public.strategy_tools
  for each row execute function public.touch_updated_at();
create trigger strategy_tools_audit after insert or update or delete on public.strategy_tools
  for each row execute function public.write_audit();

alter table public.strategy_tools enable row level security;

-- Cliente (qualquer papel no projeto) vê o que foi compartilhado; a equipe vê tudo.
create policy strategy_tools_select on public.strategy_tools for select to authenticated
  using (
    public.is_project_staff(project_id)
    or (visibility = 'client' and public.can_access_project(project_id))
  );
create policy strategy_tools_staff on public.strategy_tools for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

grant select, insert, update, delete on public.strategy_tools to authenticated;

alter table public.action_items
  add column source_tool_id uuid references public.strategy_tools (id) on delete set null;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.strategy_tools to service_role;
  end if;
end $$;
