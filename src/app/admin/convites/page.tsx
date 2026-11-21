import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, PageTitle, inputClass, labelClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/queries";
import { formatDate } from "@/lib/status";
import { createInvite } from "../actions";

const PERFIS: Record<string, string> = {
  client_manager: "Gestor do cliente",
  client_member: "Colaborador do cliente",
  client_viewer: "Leitor do cliente",
  consultant: "Consultor",
  admin: "Administrador CEOEXPRESS",
};

function situacao(i: { accepted_at: string | null; revoked_at: string | null; expires_at: string }) {
  if (i.accepted_at) return <Badge tone="ok">Aceito</Badge>;
  if (i.revoked_at) return <Badge tone="bad">Revogado</Badge>;
  if (new Date(i.expires_at) < new Date()) return <Badge tone="warn">Expirado</Badge>;
  return <Badge tone="info">Pendente</Badge>;
}

export default async function ConvitesPage() {
  const supabase = await createClient();
  const [projects, { data: invites }, { data: users }] = await Promise.all([
    listProjects(),
    supabase
      .from("invitations")
      .select("id, email, platform_role, company_role, project_role, expires_at, accepted_at, revoked_at, created_at, project:projects(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("id, full_name, email, platform_role").order("full_name"),
  ]);
  return (
    <>
      <PageTitle eyebrow="Acesso" title="Usuários e convites">
        Cada pessoa recebe um convite individual, válido por 7 dias e para um único uso, e cria a própria senha.
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-semibold text-plum">Convites recentes</h2>
            {!invites?.length ? <EmptyState>Nenhum convite emitido.</EmptyState> : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{i.email}</p>
                      <p className="text-muted">
                        {PERFIS[i.project_role ?? i.company_role ?? i.platform_role] ?? i.platform_role}
                        {i.project ? ` · ${(i.project as unknown as { name: string }).name}` : ""} · expira {formatDate(i.expires_at)}
                      </p>
                    </div>
                    {situacao(i)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-plum">Usuários</h2>
            {!users?.length ? <EmptyState>Nenhum usuário.</EmptyState> : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between p-3 text-sm">
                    <span><strong>{u.full_name}</strong> <span className="text-muted">· {u.email}</span></span>
                    <Badge>{u.platform_role === "admin" ? "Admin" : u.platform_role === "consultant" ? "Consultor" : "Cliente"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <Card>
          <h2 className="mb-4 font-semibold text-plum">Novo convite</h2>
          <ActionForm action={createInvite} submit="Gerar convite" pending="Gerando…">
            <div className="space-y-1"><label className={labelClass} htmlFor="email">E-mail</label><input id="email" name="email" type="email" required className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="full_name">Nome (opcional)</label><input id="full_name" name="full_name" className={inputClass} /></div>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="profile">Perfil</label>
              <select id="profile" name="profile" required className={inputClass} defaultValue="client_member">
                {Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="project_id">Projeto</label>
              <select id="project_id" name="project_id" className={inputClass} defaultValue="">
                <option value="">Nenhum (só para consultor ou administrador)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.company?.trade_name} · {p.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted">O envio automático por e-mail entra na etapa de notificações. Por enquanto, copie o link gerado.</p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
