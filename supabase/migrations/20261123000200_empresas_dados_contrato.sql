-- CEOEXPRESS | Gestão Estratégica — dados de qualificação no cadastro do cliente
--
-- Endereço, contato e representante legal ficam no cadastro da empresa (ou da
-- pessoa física), para o contrato vir preenchido. Tudo opcional.
alter table public.companies
  add column if not exists cpf text check (length(cpf) <= 20),
  add column if not exists qualification_extra text check (length(qualification_extra) <= 300),
  add column if not exists address text check (length(address) <= 400),
  add column if not exists email text check (length(email) <= 200),
  add column if not exists phone text check (length(phone) <= 40),
  add column if not exists rep_name text check (length(rep_name) <= 200),
  add column if not exists rep_role text check (length(rep_role) <= 100),
  add column if not exists rep_cpf text check (length(rep_cpf) <= 20);
