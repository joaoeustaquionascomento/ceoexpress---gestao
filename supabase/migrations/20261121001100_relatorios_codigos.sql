-- CEOEXPRESS | Gestão Estratégica — relatórios automáticos e novos códigos
--
-- 1. Relatórios automáticos: o relatório do projeto inteiro (tool_id nulo) e
--    a análise de uma ferramenta (tool_id preenchido). "engine" diz quem
--    escreveu o rascunho: "regras" (automático, sem custo) ou "ia" (opcional,
--    ligado quando houver chave da IA). Nascem como rascunho interno; só depois
--    de revisados pela consultoria podem ser compartilhados com o cliente
--    (regra garantida pelo próprio banco).
-- 2. Novos códigos: pedidos de informação passam de D01 para PI-01 e ações do
--    plano de A01 para AP-01, nos projetos e na biblioteca de modelos.

-- ---------------------------------------------------------------------------
-- 1. Relatórios
-- ---------------------------------------------------------------------------
create table public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  tool_id uuid references public.strategy_tools (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  -- {"resumo": "...", "secoes": [{"titulo": "...", "texto": "..."}], "lacunas": ["..."]}
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 300000),
  engine text not null default 'regras' check (engine in ('regras', 'ia')),
  status text not null default 'rascunho' check (status in ('rascunho', 'revisado')),
  visibility public.visibility not null default 'internal',
  model text,
  usage jsonb,
  created_by uuid references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_reports_revisar_antes_de_compartilhar check (visibility = 'internal' or status = 'revisado')
);
create index on public.analysis_reports (project_id, created_at desc);
create index on public.analysis_reports (tool_id);
create index on public.analysis_reports (created_at);

create trigger analysis_reports_company before insert or update of project_id on public.analysis_reports
  for each row execute function public.sync_company_from_project();
create trigger analysis_reports_touch before update on public.analysis_reports
  for each row execute function public.touch_updated_at();
create trigger analysis_reports_audit after insert or update or delete on public.analysis_reports
  for each row execute function public.write_audit();

alter table public.analysis_reports enable row level security;

create policy analysis_reports_select on public.analysis_reports for select to authenticated
  using (
    public.is_project_staff(project_id)
    or (visibility = 'client' and public.can_access_project(project_id))
  );
create policy analysis_reports_staff on public.analysis_reports for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

grant select, insert, update, delete on public.analysis_reports to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.analysis_reports to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Códigos PI-01 (pedidos de informação) e AP-01 (ações do plano)
-- ---------------------------------------------------------------------------
update public.info_requests r
   set code = 'PI-' || substring(r.code from 2)
 where r.code ~ '^D[0-9]+$'
   and not exists (select 1 from public.info_requests x
                    where x.project_id = r.project_id and x.code = 'PI-' || substring(r.code from 2));

update public.action_items a
   set code = 'AP-' || substring(a.code from 2)
 where a.code ~ '^A[0-9]+$';

-- Biblioteca: se já existir um modelo com o código novo, o antigo sai.
delete from public.request_templates t
 where t.code ~ '^D[0-9]+$'
   and exists (select 1 from public.request_templates x where x.code = 'PI-' || substring(t.code from 2));
update public.request_templates set code = 'PI-' || substring(code from 2) where code ~ '^D[0-9]+$';

delete from public.action_templates t
 where t.code ~ '^A[0-9]+$'
   and exists (select 1 from public.action_templates x where x.code = 'AP-' || substring(t.code from 2));
update public.action_templates set code = 'AP-' || substring(code from 2) where code ~ '^A[0-9]+$';
