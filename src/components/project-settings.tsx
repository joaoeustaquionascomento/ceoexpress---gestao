import { deleteProject, updateProject } from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";
import { Card, inputClass, labelClass } from "@/components/ui";

type Project = { id: string; name: string; kind: string | null; description: string | null; status: string; starts_on: string | null };

const STATUS = [
  ["planejado", "Planejado"],
  ["ativo", "Ativo"],
  ["pausado", "Pausado"],
  ["encerrado", "Encerrado"],
] as const;

/** Edição dos dados do projeto e exclusão (só administrador). */
export function ProjectSettings({ project }: { project: Project }) {
  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-1 font-semibold text-plum">Dados do projeto</h2>
        <p className="mb-4 text-sm text-muted">Mude o nome, o tipo de serviço ou a situação quando precisar. Pedidos, ações e avaliações já criados continuam como estão.</p>
        <ActionForm action={updateProject} submit="Salvar dados do projeto">
          <input type="hidden" name="id" value={project.id} />
          <div className="space-y-1">
            <label className={labelClass} htmlFor="p_name">Nome do projeto</label>
            <input id="p_name" name="name" required defaultValue={project.name} className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="p_kind">Tipo de serviço</label>
              <input id="p_kind" name="kind" list="p_kinds" defaultValue={project.kind ?? ""} placeholder="Ex.: Reestruturação ou Mentoria" className={inputClass} />
              <datalist id="p_kinds"><option value="Mentoria" /><option value="Reestruturação" /><option value="Gestão estratégica" /></datalist>
            </div>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="p_status">Situação</label>
              <select id="p_status" name="status" defaultValue={project.status} className={inputClass}>
                {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted">Com &quot;Mentoria&quot; no tipo, o projeto mostra os modelos de mentoria e o mentorado vê a área de Mentoria.</p>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="p_start">Início</label>
            <input id="p_start" name="starts_on" type="date" defaultValue={project.starts_on ?? ""} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className={labelClass} htmlFor="p_desc">Descrição (aparece abaixo do título)</label>
            <textarea id="p_desc" name="description" rows={2} defaultValue={project.description ?? ""} className={inputClass} />
          </div>
        </ActionForm>
      </Card>
      <Card className="border-bad/40">
        <h2 className="mb-1 font-semibold text-bad">Excluir projeto</h2>
        <p className="mb-4 text-sm text-muted">
          Apaga o projeto e tudo o que está nele: pedidos e arquivos enviados, ações, agenda, ferramentas, relatórios e avaliações de mentoria.
          A empresa e os usuários continuam cadastrados. <strong>Não dá para desfazer.</strong>
        </p>
        <ActionForm action={deleteProject} submit="Excluir projeto definitivamente" pending="Excluindo…">
          <input type="hidden" name="id" value={project.id} />
          <div className="space-y-1">
            <label className={labelClass} htmlFor="p_confirm">Para confirmar, digite o nome do projeto: <span className="font-semibold">{project.name}</span></label>
            <input id="p_confirm" name="confirm" required autoComplete="off" className={inputClass} />
          </div>
        </ActionForm>
      </Card>
    </section>
  );
}
