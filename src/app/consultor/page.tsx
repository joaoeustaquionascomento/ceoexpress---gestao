import Link from "next/link";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { actionStatsByProject, listProjects, requestStatusesByProject } from "@/lib/queries";
import { progress } from "@/lib/status";

export default async function ConsultorPage() {
  const [projects, statuses, actions] = await Promise.all([listProjects(), requestStatusesByProject(), actionStatsByProject()]);
  return (
    <>
      <PageTitle eyebrow="Execução" title="Meus projetos">Somente os projetos em que você está alocado.</PageTitle>
      {projects.length === 0 ? <EmptyState>Você ainda não foi alocado em nenhum projeto.</EmptyState> : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const pr = progress(statuses.get(p.id) ?? []);
            const ac = actions.get(p.id);
            return (
              <Link key={p.id} href={`/consultor/projetos/${p.id}`}>
                <Card className="h-full hover:border-soft-rose">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose">{p.company?.trade_name}</p>
                  <h2 className="font-semibold text-plum">{p.name}</h2>
                  <p className="mt-2 text-sm text-muted">{pr.received}/{pr.total} documentos recebidos · {ac?.open ?? 0} ações abertas · {ac?.overdue ?? 0} atrasadas</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
