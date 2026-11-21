-- CEOEXPRESS | Gestão Estratégica — regras de acesso (RLS), gatilhos e auditoria

-- ---------------------------------------------------------------------------
-- Funções de apoio (security definer: leem as tabelas de vínculo sem
-- recursão de RLS; todas usam auth.uid(), nunca um id vindo do cliente)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and platform_role = 'admin'
  );
$$;

create or replace function public.project_role_of(p_project uuid) returns public.project_role
language sql stable security definer set search_path = public as $$
  select role from project_members where project_id = p_project and user_id = auth.uid();
$$;

create or replace function public.can_access_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from project_members where project_id = p_project and user_id = auth.uid()
  );
$$;

-- Equipe da consultoria no projeto: administrador ou consultor alocado.
create or replace function public.is_project_staff(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from project_members
    where project_id = p_project and user_id = auth.uid() and role = 'consultant'
  );
$$;

create or replace function public.can_access_company(p_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (select 1 from memberships where company_id = p_company and user_id = auth.uid())
    or exists (
      select 1 from project_members pm join projects p on p.id = pm.project_id
      where p.company_id = p_company and pm.user_id = auth.uid()
    );
$$;

-- Pode ver um item com visibilidade cliente/interna e, para colaboradores
-- do cliente, somente o que foi atribuído a eles.
create or replace function public.can_see_item(
  p_project uuid, p_visibility public.visibility, p_assigned uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.is_project_staff(p_project) then true
    when p_visibility = 'internal' then false
    else coalesce(
      (select case pm.role
                when 'client_member' then p_assigned = auth.uid()
                else true
              end
       from project_members pm
       where pm.project_id = p_project and pm.user_id = auth.uid()),
      false)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos genéricos
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- company_id é sempre derivado do projeto: impede gravar um item de um
-- projeto apontando para outra empresa.
create or replace function public.sync_company_from_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select company_id into strict new.company_id from projects where id = new.project_id;
  return new;
end;
$$;

create or replace function public.sync_company_from_document() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select company_id into strict new.company_id from documents where id = new.document_id;
  return new;
end;
$$;

create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_row jsonb;
begin
  v_row := to_jsonb(coalesce(new, old));
  v_company := case
    when tg_table_name = 'companies' then (v_row ->> 'id')::uuid
    else nullif(v_row ->> 'company_id', '')::uuid
  end;
  if v_company is null and v_row ? 'project_id' then
    select company_id into v_company from projects where id = (v_row ->> 'project_id')::uuid;
  end if;
  insert into audit_log (actor_id, company_id, action, entity, entity_id, before_data, after_data)
  values (
    auth.uid(), v_company, lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.forbid_audit_change() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log é somente inserção';
end;
$$;

create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function public.forbid_audit_change();

-- Regra do módulo de solicitações: o cliente só leva um item até "Enviado".
-- Análise, complementação, aprovação e "não aplicável" são da consultoria,
-- e o cliente não altera a orientação nem o responsável.
create or replace function public.guard_info_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_project_staff(old.project_id) then
    return new;
  end if;
  if new.status not in ('em_preenchimento', 'enviado') then
    raise exception 'Somente a consultoria pode definir o status %', new.status
      using errcode = '42501';
  end if;
  if old.status in ('aprovado', 'nao_aplicavel', 'em_analise') then
    raise exception 'Item em análise ou concluído não pode ser alterado pelo cliente'
      using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'O cliente só pode alterar o status do item' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Cliente só marca documento como excluído (nunca apaga) e só o que enviou.
create or replace function public.guard_document_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_project_staff(old.project_id) then
    return new;
  end if;
  if old.created_by is distinct from auth.uid() then
    raise exception 'Documento enviado por outra pessoa' using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'deleted_at' - 'updated_at' - 'title')
     <> (to_jsonb(old) - 'deleted_at' - 'updated_at' - 'title') then
    raise exception 'Alteração não permitida' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Ninguém além do administrador muda o próprio papel na plataforma.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.platform_role <> old.platform_role or new.email <> old.email then
      raise exception 'Alteração não permitida' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','companies','projects','info_requests','documents',
                           'objectives','action_items','milestones','meetings'] loop
    execute format('create trigger %I_touch before update on public.%I
                    for each row execute function public.touch_updated_at()', t, t);
  end loop;
  foreach t in array array['info_requests','documents','objectives','action_items','milestones',
                           'meetings','decisions','comments'] loop
    execute format('create trigger %I_company before insert or update of project_id on public.%I
                    for each row execute function public.sync_company_from_project()', t, t);
  end loop;
  foreach t in array array['companies','memberships','projects','project_members','invitations',
                           'info_requests','documents','document_versions','objectives','action_items',
                           'milestones','meetings','decisions'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.write_audit()', t, t);
  end loop;
end;
$$;

create trigger document_versions_company before insert on public.document_versions
  for each row execute function public.sync_company_from_document();
create trigger info_requests_guard before update on public.info_requests
  for each row execute function public.guard_info_request_update();
create trigger documents_guard before update on public.documents
  for each row execute function public.guard_document_update();
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Aceite de convite: valida o token (hash), o prazo, o uso único e o e-mail
-- da conta autenticada; só então cria os vínculos.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text, p_full_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'É preciso estar autenticado' using errcode = '42501';
  end if;
  select email into v_email from auth.users where id = v_uid;

  select * into v_inv from invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Convite inválido' using errcode = 'P0002';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'Convite revogado' using errcode = '42501';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'Convite já utilizado' using errcode = '42501';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Convite expirado' using errcode = '42501';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'Convite emitido para outro e-mail' using errcode = '42501';
  end if;

  insert into profiles (id, full_name, email, platform_role)
  values (v_uid, coalesce(nullif(trim(p_full_name), ''), v_inv.full_name, v_email), v_email, v_inv.platform_role)
  on conflict (id) do update set full_name = excluded.full_name;

  if v_inv.company_id is not null and v_inv.company_role is not null then
    insert into memberships (user_id, company_id, role)
    values (v_uid, v_inv.company_id, v_inv.company_role)
    on conflict (user_id, company_id) do update set role = excluded.role;
  end if;
  if v_inv.project_id is not null then
    insert into project_members (project_id, user_id, role)
    values (v_inv.project_id, v_uid, v_inv.project_role)
    on conflict (project_id, user_id) do update set role = excluded.role;
  end if;

  update invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.id;
end;
$$;

-- Consulta pública mínima para a tela de convite: diz apenas se o convite é
-- válido e para qual e-mail (mascarado). Não revela empresa nem projeto.
create or replace function public.invitation_preview(p_token text)
returns table (valid boolean, email_hint text, reason text)
language plpgsql stable security definer set search_path = public as $$
declare v_inv invitations%rowtype;
begin
  select * into v_inv from invitations where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  if not found then
    return query select false, null::text, 'invalido'; return;
  end if;
  if v_inv.revoked_at is not null or v_inv.accepted_at is not null then
    return query select false, null::text, 'utilizado'; return;
  end if;
  if v_inv.expires_at < now() then
    return query select false, null::text, 'expirado'; return;
  end if;
  return query select true,
    left(split_part(v_inv.email, '@', 1), 2) || '***@' || split_part(v_inv.email, '@', 2),
    null::text;
end;
$$;

-- Exclusão lógica: o arquivo some para o cliente, mas continua recuperável
-- pela consultoria (deleted_at volta a null) e todas as versões são mantidas.
create or replace function public.soft_delete_document(p_document uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_doc documents%rowtype;
begin
  select * into v_doc from documents where id = p_document and deleted_at is null;
  if not found or not public.can_access_project(v_doc.project_id) then
    raise exception 'Documento não encontrado' using errcode = 'P0002';
  end if;
  if not public.is_project_staff(v_doc.project_id) and v_doc.created_by is distinct from auth.uid() then
    raise exception 'Documento enviado por outra pessoa' using errcode = '42501';
  end if;
  update documents set deleted_at = now() where id = p_document;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invitations enable row level security;
alter table public.info_requests enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.objectives enable row level security;
alter table public.action_items enable row level security;
alter table public.milestones enable row level security;
alter table public.meetings enable row level security;
alter table public.decisions enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Perfis: o próprio, a equipe da consultoria e colegas de um mesmo projeto.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_admin()
  or exists (
    select 1 from project_members mine join project_members other on other.project_id = mine.project_id
    where mine.user_id = auth.uid() and other.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Empresas
create policy companies_select on public.companies for select to authenticated
  using (public.can_access_company(id));
create policy companies_admin on public.companies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Vínculos com empresas
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from projects p where p.company_id = memberships.company_id
                    and public.is_project_staff(p.id)));
create policy memberships_admin on public.memberships for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Projetos
create policy projects_select on public.projects for select to authenticated
  using (public.can_access_project(id));
create policy projects_admin on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Membros de projeto: participantes veem a equipe do projeto; consultores
-- alocados podem incluir pessoas do cliente; só admin aloca consultores.
create policy project_members_select on public.project_members for select to authenticated
  using (public.can_access_project(project_id));
create policy project_members_admin on public.project_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy project_members_consultant_insert on public.project_members for insert to authenticated
  with check (public.is_project_staff(project_id) and role <> 'consultant');

-- Convites: admin vê todos; consultor vê e cria os dos seus projetos, apenas
-- para usuários do cliente.
create policy invitations_select on public.invitations for select to authenticated
  using (public.is_admin() or (project_id is not null and public.is_project_staff(project_id)));
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy invitations_consultant_insert on public.invitations for insert to authenticated
  with check (
    project_id is not null and public.is_project_staff(project_id)
    and platform_role = 'client' and project_role <> 'consultant'
    and company_id = (select company_id from projects where id = project_id)
  );

-- Solicitações
create policy info_requests_select on public.info_requests for select to authenticated
  using (public.can_see_item(project_id, visibility, assigned_to));
create policy info_requests_staff on public.info_requests for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));
create policy info_requests_client_update on public.info_requests for update to authenticated
  using (public.can_see_item(project_id, visibility, assigned_to)
         and public.project_role_of(project_id) in ('client_manager', 'client_member'))
  with check (public.can_see_item(project_id, visibility, assigned_to));

-- Documentos
create policy documents_select on public.documents for select to authenticated using (
  public.is_project_staff(project_id)
  or (deleted_at is null and visibility = 'client' and public.can_access_project(project_id)
      and (info_request_id is null
           or exists (select 1 from info_requests r where r.id = documents.info_request_id
                      and public.can_see_item(r.project_id, r.visibility, r.assigned_to))))
);
create policy documents_staff on public.documents for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));
create policy documents_client_insert on public.documents for insert to authenticated with check (
  created_by = auth.uid() and origin = 'cliente' and visibility = 'client'
  and public.project_role_of(project_id) in ('client_manager', 'client_member')
  and (info_request_id is null or exists (
    select 1 from info_requests r where r.id = info_request_id and r.project_id = documents.project_id
    and public.can_see_item(r.project_id, r.visibility, r.assigned_to)))
);
-- O cliente não edita documentos diretamente: a exclusão (lógica) passa
-- pela função soft_delete_document, que confere quem enviou.

create policy document_versions_select on public.document_versions for select to authenticated
  using (exists (select 1 from documents d where d.id = document_versions.document_id));
create policy document_versions_insert on public.document_versions for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from documents d where d.id = document_id and d.deleted_at is null
                and (public.is_project_staff(d.project_id) or d.created_by = auth.uid()))
  );

-- Ações, marcos, reuniões e decisões: equipe edita; cliente consulta o que é
-- visível e atualiza o status das ações em que é executor.
create policy action_items_select on public.action_items for select to authenticated
  using (public.is_project_staff(project_id)
         or (visibility = 'client' and public.can_access_project(project_id)));
create policy action_items_staff on public.action_items for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

create policy objectives_select on public.objectives for select to authenticated
  using (public.can_access_project(project_id));
create policy objectives_staff on public.objectives for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

create policy milestones_select on public.milestones for select to authenticated
  using (public.can_access_project(project_id));
create policy milestones_staff on public.milestones for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

create policy meetings_select on public.meetings for select to authenticated
  using (public.is_project_staff(project_id)
         or (visibility = 'client' and public.can_access_project(project_id)));
create policy meetings_staff on public.meetings for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

create policy decisions_select on public.decisions for select to authenticated
  using (public.is_project_staff(project_id)
         or (visibility = 'client' and public.can_access_project(project_id)));
create policy decisions_staff on public.decisions for all to authenticated
  using (public.is_project_staff(project_id)) with check (public.is_project_staff(project_id));

-- Comentários: notas internas nunca chegam ao cliente.
create policy comments_select on public.comments for select to authenticated
  using (public.is_project_staff(project_id)
         or (visibility = 'client' and public.can_access_project(project_id)));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_access_project(project_id)
              and (visibility = 'client' or public.is_project_staff(project_id)));

-- Notificações: cada um vê as suas.
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auditoria: somente administradores leem; gravação só pelos gatilhos.
create policy audit_admin on public.audit_log for select to authenticated using (public.is_admin());

-- Usuários anônimos não têm acesso a nenhuma tabela.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
grant execute on function public.invitation_preview(text) to anon, authenticated;
grant execute on function public.accept_invitation(text, text) to authenticated;
grant execute on function public.soft_delete_document(uuid) to authenticated;
