-- Quando a consultoria muda o status junto com uma mensagem (ex.: pedir
-- complementação), o cliente recebe um único aviso em vez de dois.
create or replace function public.notify_request_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_label text;
  v_link text := '/cliente/projetos/' || new.project_id || '/pedidos/' || new.id;
begin
  if new.status = old.status or new.visibility = 'internal'
     or new.status not in ('aprovado', 'complementacao_solicitada', 'nao_aplicavel') then
    return new;
  end if;
  v_label := case new.status
    when 'aprovado' then 'aprovado'
    when 'complementacao_solicitada' then 'precisa de complementação'
    else 'marcado como não aplicável' end;

  with recipients as (
    select pm.user_id from project_members pm
    where pm.project_id = new.project_id
      and pm.user_id is distinct from auth.uid()
      and (pm.role = 'client_manager' or (pm.role = 'client_member' and pm.user_id = new.assigned_to))
  ), merged as (
    -- Aviso de mensagem deste pedido criado há pouco e ainda não lido.
    delete from notifications n using recipients r
    where n.user_id = r.user_id and n.kind = 'comentario' and n.link = v_link
      and n.read_at is null and n.created_at > now() - interval '2 minutes'
    returning n.user_id
  )
  insert into notifications (user_id, kind, title, link)
  select r.user_id, 'status_pedido',
         new.code || ' · ' || new.title || ': ' || v_label ||
           case when exists (select 1 from merged m where m.user_id = r.user_id)
                then ' (com mensagem da consultoria)' else '' end,
         v_link
  from recipients r;
  return new;
end;
$$;
