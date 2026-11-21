-- Projetos novos do Supabase podem não conceder automaticamente acesso às
-- tabelas para a chave secreta (papel service_role). O aceite de convite
-- usa essa chave no servidor, então o acesso é concedido explicitamente.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
    grant execute on all functions in schema public to service_role;
  end if;
end $$;
