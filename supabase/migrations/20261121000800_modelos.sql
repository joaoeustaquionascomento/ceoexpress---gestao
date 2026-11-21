-- CEOEXPRESS | Gestão Estratégica — biblioteca de modelos e exclusão segura
--
-- 1. Biblioteca de modelos de pedidos de informação e de ações do plano, da
--    CEOEXPRESS (vale para todos os clientes). A consultoria escolhe modelos
--    ao montar um projeto; só o administrador edita a biblioteca.
-- 2. Exclusão de pedidos e ações com proteção: não apaga pedido com arquivo
--    enviado nem ação de que outra depende.
-- 3. Carga inicial da biblioteca a partir do projeto da FIQ, sem responsáveis
--    nem prazos (esses são de cada projeto).

-- ---------------------------------------------------------------------------
-- Quem é da consultoria (administrador ou consultor da plataforma)
-- ---------------------------------------------------------------------------
create or replace function public.is_consultancy() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and platform_role in ('admin', 'consultant')
  );
$$;

-- ---------------------------------------------------------------------------
-- Tabelas da biblioteca
-- ---------------------------------------------------------------------------
create table public.request_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 1 and 20),
  title text not null,
  category text not null default 'Outros',
  stage text,
  description text,
  purpose text,
  minimum_content text,
  examples text,
  accepted_formats text[] not null default array['pdf'],
  instructions text,
  checklist jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 1 and 20),
  kind public.action_kind not null default 'acao_5w2h',
  title text not null,
  rationale text,
  area text,
  how text,
  priority public.priority not null default 'media',
  decision_inputs text,
  resources text,
  expected_evidence text,
  completion_criteria text,
  basis text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger request_templates_touch before update on public.request_templates
  for each row execute function public.touch_updated_at();
create trigger action_templates_touch before update on public.action_templates
  for each row execute function public.touch_updated_at();
create trigger request_templates_audit after insert or update or delete on public.request_templates
  for each row execute function public.write_audit();
create trigger action_templates_audit after insert or update or delete on public.action_templates
  for each row execute function public.write_audit();

alter table public.request_templates enable row level security;
alter table public.action_templates enable row level security;

create policy request_templates_read on public.request_templates for select to authenticated
  using (public.is_consultancy());
create policy request_templates_admin on public.request_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy action_templates_read on public.action_templates for select to authenticated
  using (public.is_consultancy());
create policy action_templates_admin on public.action_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.request_templates, public.action_templates to authenticated;

-- ---------------------------------------------------------------------------
-- Exclusão protegida
-- ---------------------------------------------------------------------------
create or replace function public.guard_request_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Exclusão em cascata (projeto ou empresa apagados) segue normalmente.
  if not exists (select 1 from projects where id = old.project_id) then
    return old;
  end if;
  if exists (select 1 from documents where info_request_id = old.id and deleted_at is null) then
    raise exception 'Este pedido já tem arquivos enviados e não pode ser excluído';
  end if;
  return old;
end;
$$;

create trigger info_requests_guard_delete before delete on public.info_requests
  for each row execute function public.guard_request_delete();

create or replace function public.guard_action_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from projects where id = old.project_id) then
    return old;
  end if;
  if exists (select 1 from action_dependencies where depends_on_id = old.id) then
    raise exception 'Outras ações dependem desta e ela não pode ser excluída';
  end if;
  return old;
end;
$$;

create trigger action_items_guard_delete before delete on public.action_items
  for each row execute function public.guard_action_delete();

-- Mensagens ligadas ao item excluído saem junto.
create or replace function public.drop_item_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from comments
  where target_id = old.id
    and target_type = case tg_table_name when 'info_requests' then 'info_request' else 'action_item' end;
  return old;
end;
$$;

create trigger info_requests_drop_comments after delete on public.info_requests
  for each row execute function public.drop_item_comments();
create trigger action_items_drop_comments after delete on public.action_items
  for each row execute function public.drop_item_comments();

-- ---------------------------------------------------------------------------
-- Copiar pedidos e ações de um projeto para a biblioteca (códigos já
-- existentes na biblioteca são mantidos). Só o administrador, ou o próprio
-- banco durante a migração.
-- ---------------------------------------------------------------------------
create or replace function public.import_templates_from_project(p_project uuid)
returns table (requests int, actions int)
language plpgsql security definer set search_path = public as $$
declare
  v_req int;
  v_act int;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Só o administrador edita a biblioteca de modelos';
  end if;

  insert into request_templates (code, title, category, stage, description, purpose, minimum_content,
                                 examples, accepted_formats, instructions, checklist, sort_order)
  select code, title, category, stage, description, purpose, minimum_content,
         examples, accepted_formats, instructions, checklist, sort_order
  from info_requests
  where project_id = p_project
  on conflict (code) do nothing;
  get diagnostics v_req = row_count;

  insert into action_templates (code, kind, title, rationale, area, how, priority, decision_inputs,
                                resources, expected_evidence, completion_criteria, basis, sort_order)
  select code, kind, title, rationale, area, how, priority, decision_inputs,
         resources, expected_evidence, completion_criteria, basis,
         (row_number() over (order by code, created_at))::int
  from action_items
  where project_id = p_project and code is not null and visibility = 'client'
  on conflict (code) do nothing;
  get diagnostics v_act = row_count;

  return query select v_req, v_act;
end;
$$;

revoke all on function public.import_templates_from_project(uuid) from public;
grant execute on function public.import_templates_from_project(uuid) to authenticated;

-- Carga inicial a partir da FIQ Brasil, se o projeto já estiver no banco.
do $$
begin
  if exists (select 1 from public.projects where id = 'd7fc4064-e9e4-5317-8f17-825016b0f6da') then
    perform public.import_templates_from_project('d7fc4064-e9e4-5317-8f17-825016b0f6da');
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.request_templates, public.action_templates to service_role;
  end if;
end $$;
