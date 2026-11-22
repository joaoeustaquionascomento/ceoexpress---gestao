import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageTitle, inputClass, labelClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/queries";
import { formatDate } from "@/lib/status";
import { createProject } from "../actions";

export default async function ProjetosPage() {
  const supabase = await createClient();
  const [projects, { data: companies }] = await Promise.all([
    listProjects(),
    supabase.from("companies").select("id, trade_name").eq("status", "ativo").order("trade_name"),
  ]);
  return (
    <>
      <PageTitle eyebrow="Cadastros" title="Projetos e contratos" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          {projects.length === 0 ? (
            <EmptyState>Nenhum projeto cadastrado.</EmptyState>
          ) : (
            projects.map((p) => (
              <Link key={p.id} href={`/admin/projetos/${p.id}`} className="block">
                <Card className="!p-4 hover:border-soft-rose">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose">{p.company?.trade_name}</p>
                  <p className="font-semibold text-plum">{p.name}</p>
                  <p className="text-sm text-muted">Início {formatDate(p.starts_on)} · {p.status}</p>
                </Card>
              </Link>
            ))
          )}
        </div>
        <Card>
          <h2 className="mb-4 font-semibold text-plum">Novo projeto</h2>
          <ActionForm action={createProject} submit="Criar projeto">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="company_id">Empresa</label>
              <select id="company_id" name="company_id" required className={inputClass} defaultValue="">
                <option value="" disabled>Selecione</option>
                {companies?.map((c) => <option key={c.id} value={c.id}>{c.trade_name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className={labelClass} htmlFor="name">Nome do projeto</label><input id="name" name="name" required className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="kind">Tipo de serviço</label><input id="kind" name="kind" list="kinds" placeholder="Ex.: Reestruturação ou Mentoria" className={inputClass} /><datalist id="kinds"><option value="Mentoria" /><option value="Reestruturação" /><option value="Gestão estratégica" /></datalist><p className="text-xs text-muted">Use &quot;Mentoria&quot; para liberar as avaliações e relatórios de mentoria para o mentorado.</p></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="starts_on">Início</label><input id="starts_on" name="starts_on" type="date" className={inputClass} /></div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
