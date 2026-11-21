-- Reproduz, num PostgreSQL comum, o mínimo do ambiente Supabase de que as
-- migrações dependem: papéis anon/authenticated, a tabela auth.users e a
-- função auth.uid(), que no Supabase lê o "sub" do token JWT da requisição.
-- Usado SOMENTE nos testes locais; no Supabase real isso já existe.
-- Papéis são globais no servidor: tolera outro arquivo de teste criando-os ao mesmo tempo.
do $$ begin
  begin create role anon nologin; exception when duplicate_object or unique_violation then null; end;
  begin create role authenticated nologin; exception when duplicate_object or unique_violation then null; end;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text not null unique);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
