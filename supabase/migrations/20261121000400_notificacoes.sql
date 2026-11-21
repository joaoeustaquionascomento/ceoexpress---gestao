-- Fase 2: notificações automáticas do fluxo de documentos.
-- Geradas por gatilhos no banco, para não depender de a tela lembrar de avisar.

-- Avisa a equipe da consultoria do projeto quando chega um arquivo novo.
create or replace function public.notify_new_version() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_doc documents%rowtype;
  v_req info_requests%rowtype;
  v_author text;
begin
  select * into v_doc from documents where id = new.document_id;
  if v_doc.info_request_id is not null then
    select * into v_req from info_requests where id = v_doc.info_request_id;
  end if;
  select full_name into v_author from profiles where id = new.uploaded_by;

  insert into notifications (user_id, kind, title, link)
  select pm.user_id, 'documento_recebido',
         coalesce(v_author, 'Cliente') || ' enviou ' ||
           case when new.version > 1 then 'nova versão de ' else '' end ||
           coalesce(v_req.code || ' · ' || v_req.title, v_doc.title),
         '/consultor/projetos/' || v_doc.project_id ||
           coalesce('/pedidos/' || v_doc.info_request_id, '')
  from project_members pm
  where pm.project_id = v_doc.project_id and pm.role = 'consultant'
    and pm.user_id is distinct from new.uploaded_by;
  return new;
end;
$$;

create trigger document_versions_notify after insert on public.document_versions
  for each row execute function public.notify_new_version();

-- Avisa o cliente quando a consultoria muda o status de um pedido para
-- aprovado, complementação solicitada ou não aplicável.
create or replace function public.notify_request_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if new.status = old.status or new.visibility = 'internal'
     or new.status not in ('aprovado', 'complementacao_solicitada', 'nao_aplicavel') then
    return new;
  end if;
  v_label := case new.status
    when 'aprovado' then 'aprovado'
    when 'complementacao_solicitada' then 'precisa de complementação'
    else 'marcado como não aplicável' end;

  insert into notifications (user_id, kind, title, link)
  select pm.user_id, 'status_pedido', new.code || ' · ' || new.title || ': ' || v_label,
         '/cliente/projetos/' || new.project_id || '/pedidos/' || new.id
  from project_members pm
  where pm.project_id = new.project_id
    and pm.user_id is distinct from auth.uid()
    and (pm.role = 'client_manager' or (pm.role = 'client_member' and pm.user_id = new.assigned_to));
  return new;
end;
$$;

create trigger info_requests_notify after update of status on public.info_requests
  for each row execute function public.notify_request_status();

-- Avisa a outra parte quando há comentário visível ao cliente.
create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_staff boolean := public.is_project_staff(new.project_id);
  v_req info_requests%rowtype;
begin
  if new.target_type <> 'info_request' then return new; end if;
  select * into v_req from info_requests where id = new.target_id;

  insert into notifications (user_id, kind, title, link)
  select pm.user_id, 'comentario',
         'Nova mensagem em ' || v_req.code || ' · ' || v_req.title,
         case when pm.role = 'consultant' then '/consultor' else '/cliente' end
           || '/projetos/' || new.project_id || '/pedidos/' || new.target_id
  from project_members pm
  where pm.project_id = new.project_id
    and pm.user_id <> new.author_id
    and (
      (not v_staff and pm.role = 'consultant')
      or (v_staff and new.visibility = 'client'
          and (pm.role = 'client_manager' or (pm.role = 'client_member' and pm.user_id = v_req.assigned_to)))
      or (v_staff and new.visibility = 'internal' and pm.role = 'consultant')
    );
  return new;
end;
$$;

create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment();

-- Comentário precisa apontar para um item do mesmo projeto.
create or replace function public.check_comment_target() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'info_request' and not exists (
       select 1 from info_requests where id = new.target_id and project_id = new.project_id) then
    raise exception 'Item não pertence ao projeto' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger comments_target before insert on public.comments
  for each row execute function public.check_comment_target();

-- Restaurar documento excluído: só a consultoria.
create or replace function public.restore_document(p_document uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_project uuid;
begin
  select project_id into v_project from documents where id = p_document;
  if v_project is null or not public.is_project_staff(v_project) then
    raise exception 'Documento não encontrado' using errcode = 'P0002';
  end if;
  update documents set deleted_at = null where id = p_document;
end;
$$;
grant execute on function public.restore_document(uuid) to authenticated;

-- Comentários de um pedido só são vistos por quem vê o pedido (colaborador
-- do cliente vê apenas os dos pedidos atribuídos a ele).
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (
  public.is_project_staff(project_id)
  or (visibility = 'client' and public.can_access_project(project_id)
      and (target_type <> 'info_request' or exists (
        select 1 from info_requests r where r.id = comments.target_id
        and public.can_see_item(r.project_id, r.visibility, r.assigned_to))))
);

create or replace function public.check_comment_target() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_req info_requests%rowtype;
begin
  if new.target_type = 'info_request' then
    select * into v_req from info_requests where id = new.target_id and project_id = new.project_id;
    if not found or not public.can_see_item(v_req.project_id, v_req.visibility, v_req.assigned_to) then
      raise exception 'Item não pertence ao projeto' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
