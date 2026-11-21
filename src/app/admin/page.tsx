import Link from "next/link";
import { Card, EmptyState, PageTitle, Stat } from "@/components/ui";
import { actionStatsByProject, listProjects, requestStatusesByProject } from "@/lib/queries";
import { progress } from "@/lib/status";

export default async function CarteiraPage() {
  const [projects, statuses, actions] = await Promise.all([listProjects(), requestStatusesByProject(), actionStatsByProject()]);
  const all = progress([...statuses.values()].flat());
  const totals = [...actions.values()].reduce((t, a) => ({ open: t.open + a.open, overdue: t.overdue + a.overdue }), { open: 0, overdue: 0 });
  const companies = new Set(projects.map((p) => p.company?.id)).size;

  return (
    <>
      <PageTitle eyebrow="Visão consolidada" title="Carteira de projetos">
        Números calculados a partir dos registros do sistema.
      </PageTitle>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clientes ativos" value={companies} hint={`${projects.length} projeto(s)`} />
        <Stat label="Documentos recebidos" value={`${all.receivedPct}%`} hint={`${all.received} de ${all.total}`} />
        <Stat label="Ações em aberto" value={totals.open} />
        <Stat label="Ações atrasadas" value={totals.overdue} />
      </div>
      {projects.length === 0 ? (
        <EmptyState>Nenhum projeto cadastrado. Comece em Empresas.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const pr = progress(statuses.get(p.id) ?? []);
            const ac = actions.get(p.id);
            return (
              <Link key={p.id} href={`/admin/projetos/${p.id}`} className="block">
                <Card className="h-full transition hover:border-soft-rose">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose">{p.company?.trade_name}</p>
                  <h2 className="mt-1 text-lg font-semibold text-plum">{p.name}</h2>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-tint" aria-hidden>
                    <div className="h-full bg-mauve" style={{ width: `${pr.receivedPct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {pr.received} de {pr.total} documentos recebidos · {pr.approved} aprovados · {ac?.overdue ?? 0} ações atrasadas
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
