import Link from "next/link";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listProjects, requestStatusesByProject } from "@/lib/queries";
import { formatDate, progress } from "@/lib/status";

export default async function ClientePage() {
  const user = (await getSessionUser())!;
  const supabase = await createClient();
  const [projects, statuses, { data: mine }] = await Promise.all([
    listProjects(),
    requestStatusesByProject(),
    supabase
      .from("info_requests")
      .select("id, code, title, due_on, project_id")
      .eq("assigned_to", user.id)
      .in("status", ["nao_iniciado", "em_preenchimento", "complementacao_solicitada"])
      .order("due_on"),
  ]);
  const companies = [...new Set(projects.map((p) => p.company?.trade_name).filter(Boolean))];

  return (
    <>
      <PageTitle eyebrow="ÁREA DO CLIENTE" title={companies.join(" · ") || "Área do Cliente"}>
        Bem-vindo à Área do Cliente CEOEXPRESS, {user.fullName.split(" ")[0]}. Este ambiente foi desenvolvido para
        centralizar o envio de informações, o compartilhamento de documentos e o acompanhamento das atividades
        necessárias à execução do seu projeto. Selecione uma etapa para consultar as orientações, anexar os arquivos
        solicitados e acompanhar as pendências.
      </PageTitle>

      {mine && mine.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-2 font-semibold text-plum">Sob sua responsabilidade</h2>
          <ul className="divide-y divide-line text-sm">
            {mine.map((r) => (
              <li key={r.id} className="py-2">
                <Link href={`/cliente/projetos/${r.project_id}`} className="flex justify-between gap-3 hover:text-plum">
                  <span><strong>{r.code}</strong> · {r.title}</span>
                  <span className="whitespace-nowrap text-muted">{formatDate(r.due_on)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="mb-3 font-semibold text-plum">Seus projetos</h2>
      {projects.length === 0 ? <EmptyState>Nenhum projeto liberado para o seu acesso.</EmptyState> : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const pr = progress(statuses.get(p.id) ?? []);
            return (
              <Link key={p.id} href={`/cliente/projetos/${p.id}`}>
                <Card className="h-full hover:border-soft-rose">
                  <h3 className="text-lg font-semibold text-plum">{p.name}</h3>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-tint" aria-hidden>
                    <div className="h-full bg-mauve" style={{ width: `${pr.receivedPct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted">{pr.received} de {pr.total} informações enviadas · {pr.pending} pendentes</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
