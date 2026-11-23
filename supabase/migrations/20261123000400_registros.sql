-- Registro de decisões ampliado: além de decisões, lacunas, hipóteses e
-- premissas, passa a guardar propostas recebidas para avaliar (de fornecedores
-- ou parceiros) e alinhamentos combinados em reuniões ou conselhos. Os próximos
-- passos de um registro viram ações do plano (AP), marcadas com o lado
-- responsável (consultoria ou cliente).

alter table public.decisions drop constraint if exists decisions_kind_check;
alter table public.decisions add constraint decisions_kind_check
  check (kind in ('decisao', 'lacuna', 'hipotese', 'premissa', 'proposta', 'alinhamento'));

alter table public.decisions drop constraint if exists decisions_status_check;
alter table public.decisions add constraint decisions_status_check
  check (status in ('aguardando', 'a_apurar', 'em_avaliacao', 'adiada', 'aprovada', 'rejeitada', 'resolvida'));

alter table public.decisions
  add column if not exists topic text check (topic is null or length(topic) <= 200),          -- assunto (ex.: time de vendas)
  add column if not exists details text check (details is null or length(details) <= 20000), -- texto completo recebido ou combinado
  add column if not exists link_url text check (link_url is null or (length(link_url) <= 1000 and link_url ~* '^https?://')),
  add column if not exists source text check (source is null or length(source) <= 200),      -- quem trouxe (fornecedor, parceiro, pessoa)
  add column if not exists cost_note text check (cost_note is null or length(cost_note) <= 2000), -- custo estimado ou condições
  add column if not exists review_on date;                                                    -- revisar em (deixar no radar)

create index if not exists decisions_project_review_idx on public.decisions (project_id, review_on);

-- Ações do plano: de qual registro vieram e de quem é o próximo passo.
alter table public.action_items
  add column if not exists decision_id uuid references public.decisions (id) on delete set null,
  add column if not exists side text check (side is null or side in ('consultoria', 'cliente'));

create index if not exists action_items_decision_idx on public.action_items (decision_id);

-- A ação e o registro de origem precisam ser do mesmo projeto.
create or replace function public.check_action_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.decision_id is not null and not exists (
       select 1 from decisions where id = new.decision_id and project_id = new.project_id) then
    raise exception 'O registro de origem precisa ser do mesmo projeto' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists action_items_decision_check on public.action_items;
create trigger action_items_decision_check before insert or update of decision_id, project_id
  on public.action_items for each row execute function public.check_action_decision();
