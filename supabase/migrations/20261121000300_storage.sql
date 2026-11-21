-- Armazenamento de arquivos (Supabase Storage). Bucket privado; nenhum arquivo
-- é público. O caminho segue <empresa>/<projeto>/<documento>/v<N>.<ext> e o
-- acesso é decidido pelas mesmas regras das tabelas documents/document_versions.
-- Este arquivo só tem efeito onde o esquema "storage" do Supabase existe.
do $outer$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'schema storage ausente: políticas de arquivos não aplicadas (ambiente de teste)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit)
  values ('documentos', 'documentos', false, 26214400)
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

  execute $p$
    create policy documentos_read on storage.objects for select to authenticated using (
      bucket_id = 'documentos'
      and exists (select 1 from public.document_versions v where v.storage_path = storage.objects.name)
    )
  $p$;

  execute $p$
    create policy documentos_upload on storage.objects for insert to authenticated with check (
      bucket_id = 'documentos'
      and exists (
        select 1 from public.documents d
        where d.id::text = (storage.foldername(name))[3]
          and d.company_id::text = (storage.foldername(name))[1]
          and d.project_id::text = (storage.foldername(name))[2]
          and d.deleted_at is null
          and (public.is_project_staff(d.project_id) or d.created_by = auth.uid())
      )
    )
  $p$;
  -- Sem políticas de update/delete: versões não são sobrescritas nem apagadas
  -- pelo app; a substituição cria uma nova versão.
end
$outer$;
