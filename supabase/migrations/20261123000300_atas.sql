-- CEOEXPRESS | Gestão Estratégica — atas de reunião a partir da transcrição
--
-- Cada encontro da agenda pode ter uma ata estruturada: participantes, pauta,
-- resumo, assuntos tratados, decisões e encaminhamentos. A ata nasce como
-- rascunho (feita pela IA a partir da transcrição, ou em branco para
-- preencher) e só aparece para o cliente depois de revisada pela consultoria
-- e se o encontro não for interno (regra garantida pelo próprio banco).
-- A transcrição em si não é guardada. A ata também pode vir pronta de fora
-- (texto ou arquivo); um arquivo enviado fica anexado como documento do
-- projeto, interno até a ata ser revisada.

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  -- {"participantes": [...], "pauta": [...], "resumo": "...", "assuntos": [{"titulo","texto"}],
  --  "decisoes": [{"texto","responsavel","decision_id"}],
  --  "encaminhamentos": [{"oque","responsavel","prazo","action_id"}], "pendencias": [...]}
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 300000),
  -- manual: em branco ou digitada; regras: montada da transcrição sem IA;
  -- importada: ata pronta trazida de fora; ia: escrita pela IA.
  engine text not null default 'manual' check (engine in ('manual', 'regras', 'importada', 'ia')),
  attachment_document_id uuid references public.documents (id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'revisada')),
  model text,
  usage jsonb,
  created_by uuid references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meeting_minutes_project_idx on public.meeting_minutes (project_id);
create index if not exists meeting_minutes_created_idx on public.meeting_minutes (created_at);

drop trigger if exists meeting_minutes_company on public.meeting_minutes;
create trigger meeting_minutes_company before insert or update of project_id on public.meeting_minutes
  for each row execute function public.sync_company_from_project();
drop trigger if exists meeting_minutes_touch on public.meeting_minutes;
create trigger meeting_minutes_touch before update on public.meeting_minutes
  for each row execute function public.touch_updated_at();
drop trigger if exists meeting_minutes_audit on public.meeting_minutes;
create trigger meeting_minutes_audit after insert or update or delete on public.meeting_minutes
  for each row execute function public.write_audit();

-- O encontro precisa ser do mesmo projeto da ata.
create or replace function public.check_meeting_minutes_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from meetings m where m.id = new.meeting_id and m.project_id = new.project_id) then
    raise exception 'O encontro não pertence a este projeto' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists meeting_minutes_same_project on public.meeting_minutes;
create trigger meeting_minutes_same_project before insert or update of meeting_id, project_id on public.meeting_minutes
  for each row execute function public.check_meeting_minutes_project();

alter table public.meeting_minutes enable row level security;

drop policy if exists meeting_minutes_select on public.meeting_minutes;
create policy meeting_minutes_select on public.meeting_minutes for select to authenticated
  using (
    public.is_project_staff(project_id)
    or (
      status = 'revisada'
      and public.can_access_project(project_id)
      and exists (select 1 from public.meetings m where m.id = meeting_id and m.visibility = 'client')
    )
  );
drop policy if exists meeting_minutes_staff on public.meeting_minutes;
create policy meeting_minutes_staff on public.meeting_minutes for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

grant select, insert, update, delete on public.meeting_minutes to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.meeting_minutes to service_role;
  end if;
end $$;
