-- CEOEXPRESS | Gestão Estratégica — contratos
--
-- 1. Configurações: os dados da contratada (quem presta o serviço), usados em
--    todo contrato. Uma linha só.
-- 2. Modelos de contrato (minutas-padrão) com campos {{assim}}.
-- 3. Contratos: os dados preenchidos (JSON), o texto final congelado ao gerar o
--    PDF, o PDF gerado e o PDF assinado (gov.br ou outro), com hash SHA-256.
-- Só o administrador cria e vê contratos. O cliente vê apenas os contratos
-- assinados da empresa dele que o administrador liberar.

-- ---------------------------------------------------------------------------
-- 1. Configurações
-- ---------------------------------------------------------------------------
create table public.contract_settings (
  id boolean primary key default true check (id),
  provider_name text not null default '' check (length(provider_name) <= 200),
  provider_document text not null default '' check (length(provider_document) <= 40),
  provider_qualification text not null default '' check (length(provider_qualification) <= 2000),
  payment_instructions text not null default '' check (length(payment_instructions) <= 600),
  default_city text not null default '' check (length(default_city) <= 120),
  default_forum text not null default '' check (length(default_forum) <= 120),
  updated_at timestamptz not null default now()
);
insert into public.contract_settings (id) values (true);

create trigger contract_settings_touch before update on public.contract_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Modelos
-- ---------------------------------------------------------------------------
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 200),
  description text check (length(description) <= 1000),
  body text not null check (length(body) between 10 and 100000),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger contract_templates_touch before update on public.contract_templates
  for each row execute function public.touch_updated_at();
create trigger contract_templates_audit after insert or update or delete on public.contract_templates
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------------
-- 3. Contratos
-- ---------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 1 and 20),
  template_id uuid references public.contract_templates (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  title text not null check (length(title) between 3 and 200),
  party_name text not null default '' check (length(party_name) <= 200),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'gerado', 'enviado', 'assinado', 'cancelado')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  -- Texto final, congelado quando o PDF é gerado.
  body text,
  pdf_path text,
  pdf_sha256 text check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  generated_at timestamptz,
  sent_at timestamptz,
  signed_path text,
  signed_file_name text,
  signed_sha256 text check (signed_sha256 ~ '^[0-9a-f]{64}$'),
  signed_at timestamptz,
  client_visible boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_gerado_tem_pdf check (status in ('rascunho', 'cancelado') or (pdf_path is not null and body is not null)),
  constraint contracts_assinado_tem_arquivo check (status <> 'assinado' or signed_path is not null),
  constraint contracts_cliente_so_assinado check (not client_visible or (status = 'assinado' and company_id is not null))
);
create index on public.contracts (created_at desc);
create index on public.contracts (company_id);

-- Contrato assinado não muda mais (só liberar/ocultar para o cliente).
create or replace function public.guard_contract_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.signed_path is not null then
      raise exception 'Contrato assinado não pode ser excluído.';
    end if;
    return old;
  end if;
  if old.status = 'assinado' then
    if (to_jsonb(new) - 'client_visible' - 'company_id' - 'updated_at')
       is distinct from (to_jsonb(old) - 'client_visible' - 'company_id' - 'updated_at') then
      raise exception 'Contrato assinado não pode ser alterado.';
    end if;
  end if;
  return new;
end;
$$;

create trigger contracts_guard before update or delete on public.contracts
  for each row execute function public.guard_contract_change();
create trigger contracts_touch before update on public.contracts
  for each row execute function public.touch_updated_at();
create trigger contracts_audit after insert or update or delete on public.contracts
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------------
-- Acesso
-- ---------------------------------------------------------------------------
alter table public.contract_settings enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;

create policy contract_settings_admin on public.contract_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy contract_templates_admin on public.contract_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy contracts_admin on public.contracts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy contracts_client_select on public.contracts for select to authenticated
  using (
    client_visible and status = 'assinado' and company_id is not null
    and exists (select 1 from public.memberships m where m.company_id = contracts.company_id and m.user_id = auth.uid())
  );

grant select, insert, update, delete on public.contract_settings, public.contract_templates, public.contracts to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.contract_settings, public.contract_templates, public.contracts to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Arquivos: bucket privado "contratos", caminho <contrato>/<arquivo>.pdf
-- ---------------------------------------------------------------------------
do $outer$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'schema storage ausente: políticas de contratos não aplicadas (ambiente de teste)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit)
  values ('contratos', 'contratos', false, 26214400)
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

  execute $p$
    create policy contratos_read on storage.objects for select to authenticated using (
      bucket_id = 'contratos'
      and (
        public.is_admin()
        or exists (select 1 from public.contracts c
                   where c.signed_path = storage.objects.name)
      )
    )
  $p$;

  execute $p$
    create policy contratos_upload on storage.objects for insert to authenticated with check (
      bucket_id = 'contratos'
      and public.is_admin()
      and exists (select 1 from public.contracts c where c.id::text = (storage.foldername(name))[1])
    )
  $p$;
end
$outer$;

-- ---------------------------------------------------------------------------
-- Modelo inicial, genérico (o administrador ajusta ou cria outros)
-- ---------------------------------------------------------------------------
insert into public.contract_templates (title, description, sort_order, body) values (
  'Contrato de prestação de serviços',
  'Modelo genérico para consultoria, mentoria ou assessoria. O escopo detalhado vai no Anexo I.',
  0,
  $tpl$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE {{servico_maiusculo}}

{{contratada_qualificacao}} ("Contratada");

{{contratante_qualificacao}} ("Contratante").

Contratante e Contratada, em conjunto denominadas "Partes" e, individualmente, "Parte".

{{preambulo}}

Resolvem as Partes firmar o presente Contrato de Prestação de Serviços de {{servico}} ("Contrato"), que se regerá pelas cláusulas seguintes.

## Cláusula Primeira – Do Objeto

1.1 {{objeto}}

1.2 O escopo de trabalho, as etapas e os entregáveis estão detalhados no Anexo I, parte integrante e indissociável deste Contrato.

1.3 Duração prevista: {{duracao}}, podendo ser ajustada de comum acordo entre as Partes conforme a evolução dos trabalhos.

## Cláusula Segunda – Da Natureza dos Serviços e da Inexistência de Vínculo

2.1 Os serviços serão prestados com autonomia técnica, sem subordinação jurídica ou hierárquica da Contratada em relação ao Contratante. A Contratada utilizará seus próprios métodos, conhecimentos e ferramentas.

2.2 Não existe vínculo empregatício entre as Partes nem entre o Contratante e as pessoas que a Contratada indicar para a execução dos serviços. As obrigações trabalhistas, previdenciárias e fiscais relativas à equipe da Contratada são de sua exclusiva responsabilidade.

2.3 Este Contrato tem natureza civil e não cria sociedade, representação comercial, agência ou qualquer outra forma de associação entre as Partes.

## Cláusula Terceira – Das Obrigações da Contratada

3.1 Executar os serviços com diligência e competência técnica, de acordo com as boas práticas de mercado e com os objetivos descritos no Anexo I.

3.2 Manter o Contratante informado sobre o andamento dos trabalhos, por meio de reuniões periódicas e canais de comunicação ágeis.

3.3 Responder pelos danos que, por ação ou omissão comprovada, causar ao Contratante na execução dos serviços.

## Cláusula Quarta – Das Obrigações do Contratante

4.1 Participar ativamente dos encontros agendados, fornecer as informações e os documentos necessários e realizar as atividades combinadas entre as Partes.

4.2 Responder pela veracidade e integridade das informações fornecidas, reconhecendo que a qualidade dos entregáveis depende da exatidão desse material.

4.3 Efetuar os pagamentos nas datas e formas previstas na Cláusula Quinta.

## Cláusula Quinta – Do Preço e das Condições de Pagamento

5.1 Pelos serviços objeto deste Contrato, o Contratante pagará à Contratada o valor total de {{valor_total}} ({{valor_total_extenso}}).

5.2 O valor será pago da seguinte forma:

{{parcelas}}

5.3 Forma de pagamento: {{forma_pagamento}}.

5.4 O atraso no pagamento de qualquer parcela sujeitará o Contratante a multa de {{multa_atraso}} sobre o valor devido, juros de mora de {{juros_mes}} ao mês e correção monetária pelo {{indice_correcao}}, calculados pro rata die até a data do efetivo pagamento.

## Cláusula Sexta – Das Penalidades e da Rescisão

6.1 O descumprimento de obrigação relevante deste Contrato, não corrigido em até {{prazo_cura}} dias após notificação, sujeitará a Parte infratora a multa de {{multa_rescisoria}} do valor total contratado, sem prejuízo de perdas e danos.

6.2 As Partes podem encerrar este Contrato a qualquer tempo, de comum acordo, por termo de distrato escrito.

6.3 Qualquer das Partes pode rescindir este Contrato sem motivo, mediante aviso por escrito com antecedência mínima de {{aviso_previo}} dias, durante os quais as obrigações continuam em vigor.

6.4 Em qualquer caso de término, o Contratante pagará os valores proporcionais aos serviços efetivamente prestados até a data do encerramento, além das multas aplicáveis, se houver.

## Cláusula Sétima – Da Confidencialidade

7.1 A Contratada manterá sigilo sobre as informações não públicas do Contratante a que tiver acesso em razão deste Contrato.

7.2 A obrigação de sigilo vale durante a vigência deste Contrato e por {{sigilo_anos}} anos após o seu término.

7.3 Não são confidenciais as informações de domínio público, as que a Contratada já detinha antes de recebê-las e aquelas cuja divulgação seja exigida por lei ou ordem judicial.

7.4 Os métodos, modelos e ferramentas próprios da Contratada, anteriores e independentes deste Contrato, continuam de sua titularidade, e o seu uso não caracteriza violação de sigilo.

## Cláusula Oitava – Da Proteção de Dados Pessoais (LGPD)

8.1 As Partes tratarão os dados pessoais envolvidos neste Contrato de acordo com a Lei nº 13.709/2018 (LGPD), somente na medida necessária à execução dos serviços.

8.2 A Contratada adotará medidas de segurança adequadas para proteger os dados pessoais recebidos e, ao término do Contrato, os eliminará de forma segura, ressalvadas as hipóteses de guarda previstas em lei e os registros anonimizados.

## Cláusula Nona – Das Disposições Gerais

9.1 Este Contrato, com o seu Anexo I, representa o acordo integral entre as Partes e substitui entendimentos anteriores, verbais ou escritos.

9.2 A tolerância de uma Parte quanto ao descumprimento de qualquer obrigação não constitui novação nem renúncia de direito.

9.3 As Partes reconhecem a validade das assinaturas eletrônicas apostas neste instrumento, inclusive por meio da plataforma gov.br, nos termos da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.

9.4 As comunicações entre as Partes serão feitas por escrito, preferencialmente por e-mail, para os endereços informados neste Contrato.

9.5 Fica eleito o foro da Comarca de {{foro}} para dirimir quaisquer controvérsias oriundas deste Contrato, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem de acordo, as Partes assinam este Contrato eletronicamente.

> {{cidade}}, {{data_extenso}}.

{{assinaturas}}

---

# ANEXO I – ESCOPO DOS SERVIÇOS

{{escopo}}
$tpl$
);
