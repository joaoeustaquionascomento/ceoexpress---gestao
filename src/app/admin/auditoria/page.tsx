import Link from "next/link";
import { Badge, EmptyState, PageTitle } from "@/components/ui";
import { AUDIT_ACTION, AUDIT_ENTITY, changedFields, recordLabel } from "@/lib/audit-format";
import { formatDateTime } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE = 50;

type Entry = {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  company_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f = {
    empresa: sp.empresa && UUID.test(sp.empresa) ? sp.empresa : "",
    entidade: sp.entidade && sp.entidade in AUDIT_ENTITY ? sp.entidade : "",
    acao: sp.acao && sp.acao in AUDIT_ACTION ? sp.acao : "",
    de: sp.de && DATE.test(sp.de) ? sp.de : "",
    ate: sp.ate && DATE.test(sp.ate) ? sp.ate : "",
  };
  const page = Math.max(1, Math.min(200, Number(sp.pagina) || 1));

  const supabase = await createClient();
  let q = supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, company_id, action, entity, entity_id, before_data, after_data")
    .order("occurred_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE); // um a mais para saber se há próxima página
  if (f.empresa) q = q.eq("company_id", f.empresa);
  if (f.entidade) q = q.eq("entity", f.entidade);
  if (f.acao) q = q.eq("action", f.acao);
  if (f.de) q = q.gte("occurred_at", `${f.de}T00:00:00-03:00`);
  if (f.ate) q = q.lte("occurred_at", `${f.ate}T23:59:59.999-03:00`);

  const [logRes, companiesRes] = await Promise.all([
    q,
    supabase.from("companies").select("id, trade_name").order("trade_name"),
  ]);
  const rows = (logRes.data ?? []) as Entry[];
  const hasNext = rows.length > PAGE;
  const entries = rows.slice(0, PAGE);
  const companies = companiesRes.data ?? [];
  const companyName = new Map(companies.map((c) => [c.id, c.trade_name]));

  const actorIds = [...new Set(entries.map((e) => e.actor_id).filter(Boolean))] as string[];
  const { data: people } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const actorName = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email || "Usuário"]));

  const qs = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
    if (n > 1) p.set("pagina", String(n));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const filtered = Object.values(f).some(Boolean);
  const field = "min-h-11 rounded-lg border border-line bg-surface px-2";

  return (
    <>
      <PageTitle eyebrow="Administração" title="Auditoria">
        Quem criou, alterou ou excluiu cada registro do sistema. O registro não pode ser editado nem apagado.
      </PageTitle>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
        <label className="space-y-1">
          <span className="block font-semibold">Empresa</span>
          <select name="empresa" defaultValue={f.empresa} className={field}>
            <option value="">Todas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-semibold">O quê</span>
          <select name="entidade" defaultValue={f.entidade} className={field}>
            <option value="">Tudo</option>
            {Object.entries(AUDIT_ENTITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-semibold">Ação</span>
          <select name="acao" defaultValue={f.acao} className={field}>
            <option value="">Todas</option>
            {Object.entries(AUDIT_ACTION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-semibold">De</span>
          <input type="date" name="de" defaultValue={f.de} className={field} />
        </label>
        <label className="space-y-1">
          <span className="block font-semibold">Até</span>
          <input type="date" name="ate" defaultValue={f.ate} className={field} />
        </label>
        <button className="min-h-11 rounded-lg border border-line px-4 font-semibold text-mauve hover:bg-tint">Filtrar</button>
        {filtered && <Link href="/admin/auditoria" className="inline-flex min-h-11 items-center px-2 font-semibold text-mauve">Limpar</Link>}
      </form>

      {logRes.error ? (
        <EmptyState>Não foi possível carregar a auditoria agora. Tente de novo em instantes.</EmptyState>
      ) : entries.length === 0 ? (
        <EmptyState>Nenhum registro encontrado.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const changed = e.action === "update" ? changedFields(e.before_data, e.after_data) : [];
            const label = recordLabel(e.before_data, e.after_data);
            return (
              <li key={e.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={e.action === "delete" ? "bad" : e.action === "insert" ? "ok" : "info"}>
                    {AUDIT_ACTION[e.action] ?? e.action}
                  </Badge>
                  <span className="font-semibold text-ink">{AUDIT_ENTITY[e.entity] ?? e.entity}</span>
                  {label && <span className="text-ink">· {label}</span>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatDateTime(e.occurred_at)} · {e.actor_id ? actorName.get(e.actor_id) ?? "Usuário removido" : "Sistema"}
                  {e.company_id && companyName.get(e.company_id) ? ` · ${companyName.get(e.company_id)}` : ""}
                </p>
                {changed.length > 0 && <p className="mt-1 text-xs text-muted">Campos alterados: {changed.join(", ")}</p>}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-mauve">Ver dados completos</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {e.before_data && (
                      <pre className="max-h-64 overflow-auto rounded-lg bg-canvas p-2 text-xs">Antes:{"\n"}{JSON.stringify(e.before_data, null, 2)}</pre>
                    )}
                    {e.after_data && (
                      <pre className="max-h-64 overflow-auto rounded-lg bg-canvas p-2 text-xs">Depois:{"\n"}{JSON.stringify(e.after_data, null, 2)}</pre>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav className="mt-4 flex justify-between text-sm" aria-label="Páginas">
          {page > 1 ? <Link href={`/admin/auditoria${qs(page - 1)}`} className="inline-flex min-h-11 items-center font-semibold text-mauve">← Mais recentes</Link> : <span />}
          {hasNext && <Link href={`/admin/auditoria${qs(page + 1)}`} className="inline-flex min-h-11 items-center font-semibold text-mauve">Mais antigos →</Link>}
        </nav>
      )}
    </>
  );
}
