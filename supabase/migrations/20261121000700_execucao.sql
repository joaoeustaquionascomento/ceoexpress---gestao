-- Fase 3: execução. Dependências entre ações, histórico de status, atualização
-- do status pelo executor do cliente, comentários e avisos nas ações.

-- Dependências: a ação só pode ser concluída depois das ações de que depende.
create table public.action_dependencies (
  action_id uuid not null references public.action_items (id) on delete cascade,
  depends_on_id uuid not null references public.action_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (action_id, depends_on_id),
  check (action_id <> depends_on_id)
);
create index on public.action_dependencies (depends_on_id);

create or replace function public.check_action_dependency() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select project_id from action_items where id = new.action_id)
     is distinct from (select project_id from action_items where id = new.depends_on_id) then
    raise exception 'As ações precisam ser do mesmo projeto' using errcode = '42501';
  end if;
  -- Impede ciclos (A depende de B que depende de A).
  if exists (
    with recursive chain(id) as (
      select depends_on_id from action_dependencies where action_id = new.depends_on_id
      union
      select d.depends_on_id from action_dependencies d join chain c on d.action_id = c.id
    )
    select 1 from chain where id = new.action_id
  ) then
    raise exception 'Essa dependência criaria um ciclo entre ações' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger action_dependencies_check before insert or update on public.action_dependencies
  for each row execute function public.check_action_dependency();

alter table public.action_dependencies enable row level security;
create policy action_dependencies_select on public.action_dependencies for select to authenticated
  using (exists (select 1 from action_items a where a.id = action_id));
create policy action_dependencies_staff on public.action_dependencies for all to authenticated
  using (exists (select 1 from action_items a where a.id = action_id and public.is_project_staff(a.project_id)))
  with check (exists (select 1 from action_items a where a.id = action_id and public.is_project_staff(a.project_id)));
grant select, insert, delete on public.action_dependencies to authenticated;

-- Histórico de status das ações (gravado só pelo banco).
create table public.action_updates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  action_id uuid not null references public.action_items (id) on delete cascade,
  status_from public.action_status,
  status_to public.action_status not null,
  note text check (note is null or length(note) <= 2000),
  author_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.action_updates (action_id, created_at);

alter table public.action_updates enable row level security;
create policy action_updates_select on public.action_updates for select to authenticated
  using (exists (select 1 from action_items a where a.id = action_id));
grant select on public.action_updates to authenticated;

create or replace function public.log_action_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_note text := nullif(current_setting('app.status_note', true), '');
  v_staff boolean := public.is_project_staff(new.project_id);
begin
  if new.status = old.status then return new; end if;
  insert into action_updates (company_id, project_id, action_id, status_from, status_to, note, author_id)
  values (new.company_id, new.project_id, new.id, old.status, new.status, v_note, auth.uid());

  if new.visibility = 'client' then
    insert into notifications (user_id, kind, title, link)
    select pm.user_id, 'status_acao',
           coalesce(new.code || ' · ', '') || new.title || ': ' ||
             case new.status when 'a_fazer' then 'a fazer' when 'em_andamento' then 'em andamento'
               when 'bloqueada' then 'bloqueada' when 'concluida' then 'concluída' else 'cancelada' end,
           case when pm.role = 'consultant' then '/consultor' else '/cliente' end
             || '/projetos/' || new.project_id || '/acoes/' || new.id
    from project_members pm
    where pm.project_id = new.project_id
      and pm.user_id is distinct from auth.uid()
      and ((not v_staff and pm.role = 'consultant')
           or (v_staff and pm.user_id = new.executor_id));
  end if;
  return new;
end;
$$;

create trigger action_items_status_log after update of status on public.action_items
  for each row execute function public.log_action_status();

-- Avisa quem passa a ser executor de uma ação visível ao cliente.
create or replace function public.notify_action_executor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.executor_id is null or new.visibility <> 'client'
     or (tg_op = 'UPDATE' and new.executor_id is not distinct from old.executor_id)
     or new.executor_id = auth.uid() then
    return new;
  end if;
  insert into notifications (user_id, kind, title, link)
  select pm.user_id, 'acao_atribuida',
         'Você é responsável por ' || coalesce(new.code || ' · ', '') || new.title,
         case when pm.role = 'consultant' then '/consultor' else '/cliente' end
           || '/projetos/' || new.project_id || '/acoes/' || new.id
  from project_members pm
  where pm.project_id = new.project_id and pm.user_id = new.executor_id;
  return new;
end;
$$;

create trigger action_items_executor_notify after insert or update of executor_id on public.action_items
  for each row execute function public.notify_action_executor();

-- Executor e responsável só podem ser pessoas do próprio projeto.
create or replace function public.check_action_people() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.executor_id is not null and not exists (
       select 1 from project_members where project_id = new.project_id and user_id = new.executor_id) then
    raise exception 'O executor precisa participar do projeto' using errcode = '42501';
  end if;
  if new.approver_id is not null and not exists (
       select 1 from project_members where project_id = new.project_id and user_id = new.approver_id) then
    raise exception 'Quem decide precisa participar do projeto' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger action_items_people before insert or update of executor_id, approver_id, project_id
  on public.action_items for each row execute function public.check_action_people();

-- Atualização de status pela tela. A consultoria muda qualquer ação; do lado
-- do cliente, o gestor e o executor da ação mudam ações visíveis ao cliente,
-- sem cancelar. Nenhuma ação é concluída antes das ações de que depende.
create or replace function public.set_action_status(p_action uuid, p_status public.action_status, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_action action_items%rowtype;
  v_role project_role;
begin
  select * into v_action from action_items where id = p_action;
  if not found or not (public.is_project_staff(v_action.project_id)
       or (v_action.visibility = 'client' and public.can_access_project(v_action.project_id))) then
    raise exception 'Ação não encontrada' using errcode = 'P0002';
  end if;
  if not public.is_project_staff(v_action.project_id) then
    v_role := public.project_role_of(v_action.project_id);
    if not (v_role = 'client_manager' or (v_role = 'client_member' and v_action.executor_id = auth.uid())) then
      raise exception 'Só o gestor do cliente ou o executor podem atualizar esta ação' using errcode = '42501';
    end if;
    if p_status = 'cancelada' or v_action.status = 'cancelada' then
      raise exception 'Só a consultoria cancela ou reabre ações canceladas' using errcode = '42501';
    end if;
  end if;
  if p_status = 'concluida' and exists (
       select 1 from action_dependencies d join action_items a on a.id = d.depends_on_id
       where d.action_id = p_action and a.status not in ('concluida', 'cancelada')) then
    raise exception 'Há ações de que esta depende ainda não concluídas' using errcode = '23514';
  end if;
  if p_status = v_action.status then return; end if;
  perform set_config('app.status_note', coalesce(left(p_note, 2000), ''), true);
  update action_items set status = p_status where id = p_action;
  perform set_config('app.status_note', '', true);
end;
$$;
grant execute on function public.set_action_status(uuid, public.action_status, text) to authenticated;

-- Comentários também em ações: o item precisa ser do projeto e visível para
-- quem comenta; numa ação interna, o comentário é sempre interno.
create or replace function public.check_comment_target() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_req info_requests%rowtype;
  v_act action_items%rowtype;
begin
  if new.target_type = 'info_request' then
    select * into v_req from info_requests where id = new.target_id and project_id = new.project_id;
    if not found or not public.can_see_item(v_req.project_id, v_req.visibility, v_req.assigned_to) then
      raise exception 'Item não pertence ao projeto' using errcode = '42501';
    end if;
  elsif new.target_type = 'action_item' then
    select * into v_act from action_items where id = new.target_id and project_id = new.project_id;
    if not found or not (public.is_project_staff(v_act.project_id)
         or (v_act.visibility = 'client' and public.can_access_project(v_act.project_id))) then
      raise exception 'Item não pertence ao projeto' using errcode = '42501';
    end if;
    if v_act.visibility = 'internal' and new.visibility <> 'internal' then
      raise exception 'Comentário em ação interna precisa ser interno' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_staff boolean := public.is_project_staff(new.project_id);
  v_label text;
  v_path text;
  v_assignee uuid;
begin
  if new.target_type = 'info_request' then
    select code || ' · ' || title, assigned_to into v_label, v_assignee from info_requests where id = new.target_id;
    v_path := '/pedidos/';
  elsif new.target_type = 'action_item' then
    select coalesce(code || ' · ', '') || title, executor_id into v_label, v_assignee from action_items where id = new.target_id;
    v_path := '/acoes/';
  else
    return new;
  end if;

  insert into notifications (user_id, kind, title, link)
  select pm.user_id, 'comentario',
         'Nova mensagem em ' || v_label,
         case when pm.role = 'consultant' then '/consultor' else '/cliente' end
           || '/projetos/' || new.project_id || v_path || new.target_id
  from project_members pm
  where pm.project_id = new.project_id
    and pm.user_id <> new.author_id
    and (
      (not v_staff and pm.role = 'consultant')
      or (v_staff and new.visibility = 'client'
          and (pm.role = 'client_manager' or (pm.role = 'client_member' and pm.user_id = v_assignee)))
      or (v_staff and new.visibility = 'internal' and pm.role = 'consultant')
    );
  return new;
end;
$$;

-- Comentários de ações internas nunca chegam ao cliente.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (
  public.is_project_staff(project_id)
  or (visibility = 'client' and public.can_access_project(project_id)
      and (
        (target_type = 'info_request' and exists (
          select 1 from info_requests r where r.id = comments.target_id
          and public.can_see_item(r.project_id, r.visibility, r.assigned_to)))
        or (target_type = 'action_item' and exists (
          select 1 from action_items a where a.id = comments.target_id and a.visibility = 'client'))
        or target_type = 'document'
      ))
);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.action_dependencies, public.action_updates to service_role;
  end if;
end $$;
