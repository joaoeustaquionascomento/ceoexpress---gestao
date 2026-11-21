-- Reproduz, num PostgreSQL comum, o mínimo do ambiente Supabase de que as
-- migrações dependem: papéis anon/authenticated, a tabela auth.users e a
-- função auth.uid(), que no Supabase lê o "sub" do token JWT da requisição.
-- Usado SOMENTE nos testes locais; no Supabase real isso já existe.
-- Papéis são globais no servidor: tolera outro arquivo de teste criando-os ao mesmo tempo.
do $$ begin
  begin create role anon nologin; exception when duplicate_object or unique_violation then null; end;
  begin create role authenticated nologin; exception when duplicate_object or unique_violation then null; end;
end $$;
-- Como no Supabase, pgcrypto fica no esquema "extensions", não em "public".
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text not null unique);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Mínimo do Supabase Storage: buckets, objects (com RLS) e storage.foldername,
-- que devolve as pastas do caminho sem o nome do arquivo.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false, file_size_limit bigint
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid(),
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to authenticated;
grant execute on function storage.foldername(text) to authenticated;
