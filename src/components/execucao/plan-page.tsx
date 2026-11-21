import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BackLink, EmptyState, PageTitle, Stat } from "@/components/ui";
import { StatusForm } from "@/components/execucao/forms";
import { getProjectAccess } from "@/lib/access";
import { ACTION_STATUS, formatDate } from "@/lib/status";
import {
  ACTION_STATUSES,
  PRIORITY,
  executorName,
  getPlan,
  getProjectHeader,
  isOverdue,
  today,
  type Area,
  type PlanAction,
} from "@/lib/execucao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type Search = Record<string, string | undefined>;

function statusTone(s: string): "ok" | "bad" | "info" | "neutral" {
  return s === "concluida" ? "ok" : s === "bloqueada" ? "bad" : s === "em_andamento" ? "info" : "neutral";
}

function ActionChip({ a, href }: { a: PlanAction; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-line bg-surface p-3 text-sm hover:border-mauve">
      <p className="text-xs font-semibold text-rose">{a.code ?? "Sem código"}{a.visibility === "internal" ? " · Interna" : ""}</p>
      <p className="font-semibold text-ink">{a.title}</p>
      <p className="mt-1 text-xs text-muted">
        {executorName(a)} · {formatDate(a.due_on)}
        {isOverdue(a) && <span className="ml-1 font-semibold text-bad">· atrasada</span>}
      </p>
    </Link>
  );
}

export async function PlanPage({
  area, params, searchParams,
}: { area: Area; params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(id), getProjectAccess(id)]);
  if (!header || !access) notFound();
  const { actions, objectives, deps, meetings, milestones } = await getPlan(id);

  const base = `/${area}/projetos/${id}`;
  const view = sp.visao === "kanban" || sp.visao === "calendario" ? sp.visao : "lista";
  const canUpdate = (a: PlanAction) =>
    access.staff ||
    (a.status !== "cancelada" && (access.role === "client_manager" || (access.role === "client_member" && a.executor_id === access.userId)));

  // Filtros
  let list = actions;
  if (sp.status && ACTION_STATUSES.includes(sp.status as never)) list = list.filter((a) => a.status === sp.status);
  if (sp.objetivo && UUID.test(sp.objetivo)) list = list.filter((a) => a.objective_id === sp.objetivo);
  if (sp.minhas === "1") list = list.filter((a) => a.executor_id === access.userId);
  if (sp.atrasadas === "1") list = list.filter(isOverdue);

  const active = actions.filter((a) => a.status !== "cancelada");
  const done = active.filter((a) => a.status === "concluida").length;
  const overdue = active.filter(isOverdue).length;
  const blocked = active.filter((a) => a.status === "bloqueada").length;
  const waiting = new Set(
    deps
      .filter((d) => actions.find((x) => x.id === d.depends_on_id && x.status !== "concluida" && x.status !== "cancelada"))
      .map((d) => d.action_id),
  );

  const qs = (patch: Search) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `?${s}` : "";
  };
  const tab = (v: string, label: string) => (
    <Link
      href={`${base}/plano${qs({ visao: v === "lista" ? undefined : v })}`}
      aria-current={view === v ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ${view === v ? "bg-plum text-white" : "border border-line text-mauve hover:bg-tint"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <BackLink href={base} label="Voltar ao projeto" />
      <PageTitle eyebrow={header.company?.trade_name} title="Plano de ação">
        {header.name}
      </PageTitle>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Concluídas" value={`${done} de ${active.length}`} hint="ações não canceladas" />
        <Stat label="Atrasadas" value={overdue} hint="prazo vencido e não concluídas" />
        <Stat label="Bloqueadas" value={blocked} hint="precisam de destrave" />
        <Stat label="Aguardando outra ação" value={waiting.size} hint="dependências em aberto" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab("lista", "Lista")}
        {tab("kanban", "Kanban")}
        {tab("calendario", "Calendário")}
        <span className="flex-1" />
        <Link href={`${base}/agenda`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-mauve hover:bg-tint">
          Agenda e decisões
        </Link>
        {access.staff && (
          <Link href={`${base}/acoes/nova`} className="inline-flex min-h-11 items-center rounded-lg bg-plum px-4 text-sm font-semibold text-white hover:bg-mauve">
            Nova ação
          </Link>
        )}
      </div>

      {view !== "calendario" && (
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
          {view !== "lista" && <input type="hidden" name="visao" value={view} />}
          {view === "lista" && (
            <label className="space-y-1">
              <span className="block font-semibold">Status</span>
              <select name="status" defaultValue={sp.status ?? ""} className="min-h-11 rounded-lg border border-line bg-surface px-2">
                <option value="">Todos</option>
                {ACTION_STATUSES.map((s) => <option key={s} value={s}>{ACTION_STATUS[s]}</option>)}
              </select>
            </label>
          )}
          {objectives.length > 0 && (
            <label className="space-y-1">
              <span className="block font-semibold">Prioridade</span>
              <select name="objetivo" defaultValue={sp.objetivo ?? ""} className="min-h-11 rounded-lg border border-line bg-surface px-2">
                <option value="">Todas</option>
                {objectives.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="minhas" value="1" defaultChecked={sp.minhas === "1"} className="h-5 w-5 accent-[var(--plum)]" /> Só as minhas
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="atrasadas" value="1" defaultChecked={sp.atrasadas === "1"} className="h-5 w-5 accent-[var(--plum)]" /> Só atrasadas
          </label>
          <button className="min-h-11 rounded-lg border border-line px-4 font-semibold text-mauve hover:bg-tint">Filtrar</button>
        </form>
      )}

      {view === "lista" && <ListView list={list} base={base} waiting={waiting} />}
      {view === "kanban" && <KanbanView list={list} base={base} projectId={id} staff={access.staff} canUpdate={canUpdate} />}
      {view === "calendario" && (
        <CalendarView month={sp.mes} actions={actions} meetings={meetings} milestones={milestones} base={base} qs={qs} />
      )}
    </>
  );
}

function ListView({ list, base, waiting }: { list: PlanAction[]; base: string; waiting: Set<string> }) {
  if (list.length === 0) return <EmptyState>Nenhuma ação encontrada com esses filtros.</EmptyState>;
  return (
    <>
      {/* Celular: cartões */}
      <div className="space-y-2 md:hidden">
        {list.map((a) => (
          <div key={a.id} className="space-y-1">
            <ActionChip a={a} href={`${base}/acoes/${a.id}`} />
            <div className="flex flex-wrap gap-1 px-1">
              <Badge tone={statusTone(a.status)}>{ACTION_STATUS[a.status]}</Badge>
              <Badge tone={PRIORITY[a.priority]?.tone}>{PRIORITY[a.priority]?.label}</Badge>
              {waiting.has(a.id) && <Badge tone="warn">Aguardando outra ação</Badge>}
            </div>
          </div>
        ))}
      </div>
      {/* Tela grande: tabela */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-tint text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Quem executa</th>
              <th className="px-3 py-2">Prazo</th>
              <th className="px-3 py-2">Prioridade</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-line align-top">
                <td className="px-3 py-2">
                  <Link href={`${base}/acoes/${a.id}`} className="font-semibold text-ink hover:text-mauve">
                    {a.code ? `${a.code} · ` : ""}{a.title}
                  </Link>
                  {a.visibility === "internal" && <span className="ml-2"><Badge tone="warn">Interna</Badge></span>}
                  {waiting.has(a.id) && <span className="ml-2"><Badge tone="warn">Aguardando outra ação</Badge></span>}
                </td>
                <td className="px-3 py-2">{executorName(a)}</td>
                <td className={`whitespace-nowrap px-3 py-2 ${isOverdue(a) ? "font-semibold text-bad" : ""}`}>{formatDate(a.due_on)}</td>
                <td className="px-3 py-2"><Badge tone={PRIORITY[a.priority]?.tone}>{PRIORITY[a.priority]?.label}</Badge></td>
                <td className="px-3 py-2"><Badge tone={statusTone(a.status)}>{ACTION_STATUS[a.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KanbanView({
  list, base, projectId, staff, canUpdate,
}: { list: PlanAction[]; base: string; projectId: string; staff: boolean; canUpdate: (a: PlanAction) => boolean }) {
  const columns = ACTION_STATUSES.filter((s) => s !== "cancelada" || list.some((a) => a.status === "cancelada"));
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex gap-3" style={{ minWidth: `${columns.length * 17}rem` }}>
        {columns.map((s) => {
          const items = list.filter((a) => a.status === s);
          return (
            <section key={s} className="w-68 flex-1 rounded-xl bg-tint/60 p-2" aria-label={ACTION_STATUS[s]}>
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-plum">
                {ACTION_STATUS[s]} <span className="text-muted">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.map((a) => (
                  <div key={a.id} className="space-y-2 rounded-lg">
                    <ActionChip a={a} href={`${base}/acoes/${a.id}`} />
                    {canUpdate(a) && (
                      <details className="rounded-lg bg-surface px-3 py-1 text-sm">
                        <summary className="min-h-10 cursor-pointer py-2 font-semibold text-mauve">Mover</summary>
                        <div className="pb-2">
                          <StatusForm actionId={a.id} projectId={projectId} current={a.status} staff={staff} compact />
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">Nada aqui</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarView({
  month, actions, meetings, milestones, base, qs,
}: {
  month: string | undefined;
  actions: PlanAction[];
  meetings: { id: string; scheduled_on: string; title: string; start_time: string | null }[];
  milestones: { id: string; name: string; planned_on: string; achieved_on: string | null }[];
  base: string;
  qs: (patch: Search) => string;
}) {
  const ym = month && /^\d{4}-\d{2}$/.test(month) ? month : today().slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const key = (day: number) => `${ym}-${String(day).padStart(2, "0")}`;
  type Entry = { id: string; label: string; href?: string; tone: string };
  const byDay = new Map<string, Entry[]>();
  const push = (date: string | null | undefined, e: Entry) => {
    if (!date || !date.startsWith(ym)) return;
    const k = date.slice(0, 10);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  };
  for (const a of actions) {
    if (a.status === "cancelada") continue;
    push(a.due_on, {
      id: a.id,
      label: `${a.code ?? "Ação"} · ${a.title}`,
      href: `${base}/acoes/${a.id}`,
      tone: a.status === "concluida" ? "bg-ok-bg text-ok" : isOverdue(a) ? "bg-bad-bg text-bad" : "bg-tint text-plum",
    });
  }
  for (const mt of meetings) push(mt.scheduled_on, { id: mt.id, label: `${mt.start_time ? mt.start_time.slice(0, 5) + " " : ""}${mt.title}`, href: `${base}/agenda`, tone: "bg-warn-bg text-warn" });
  for (const ms of milestones) push(ms.planned_on, { id: ms.id, label: `Marco: ${ms.name}`, href: `${base}/agenda`, tone: ms.achieved_on ? "bg-ok-bg text-ok" : "bg-canvas text-ink border border-line" });

  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const now = today();
  const listed = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={qs({ mes: shift(-1) })} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">← Anterior</Link>
        <h2 className="text-lg font-semibold capitalize text-plum">{MONTHS[m - 1]} de {y}</h2>
        <Link href={qs({ mes: shift(1) })} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">Próximo →</Link>
      </div>
      <p className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
        <span><span className="mr-1 inline-block size-3 rounded bg-tint align-middle" />Prazo de ação</span>
        <span><span className="mr-1 inline-block size-3 rounded bg-bad-bg align-middle" />Atrasada</span>
        <span><span className="mr-1 inline-block size-3 rounded bg-ok-bg align-middle" />Concluída</span>
        <span><span className="mr-1 inline-block size-3 rounded bg-warn-bg align-middle" />Encontro</span>
      </p>

      {/* Tela grande: grade do mês */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
        <div className="grid grid-cols-7 bg-tint text-center text-xs font-semibold uppercase tracking-wider text-muted">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => (
            <div key={i} className={`min-h-28 border-t border-line p-1 ${i % 7 ? "border-l" : ""} ${d && key(d) === now ? "bg-tint/40" : ""}`}>
              {d && (
                <>
                  <p className={`px-1 text-xs ${key(d) === now ? "font-bold text-rose" : "text-muted"}`}>{d}</p>
                  <ul className="space-y-1">
                    {(byDay.get(key(d)) ?? []).map((e) => (
                      <li key={e.id}>
                        <Link href={e.href ?? "#"} className={`block truncate rounded px-1 py-0.5 text-xs font-semibold ${e.tone}`} title={e.label}>{e.label}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Celular: lista do mês */}
      <div className="space-y-3 md:hidden">
        {listed.length === 0 && <EmptyState>Nada neste mês.</EmptyState>}
        {listed.map(([day, entries]) => (
          <section key={day}>
            <h3 className="mb-1 text-sm font-semibold text-plum">{formatDate(day)}</h3>
            <ul className="space-y-1">
              {entries.map((e) => (
                <li key={e.id}><Link href={e.href ?? "#"} className={`block rounded-lg px-3 py-2 text-sm font-semibold ${e.tone}`}>{e.label}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
