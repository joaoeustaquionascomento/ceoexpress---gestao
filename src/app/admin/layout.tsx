import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");
  return (
    <AppShell
      area="Área administrativa"
      user={user}
      notificationsHref="/admin/notificacoes"
      nav={[
        { href: "/admin", label: "Carteira" },
        { href: "/admin/empresas", label: "Empresas" },
        { href: "/admin/fila", label: "Fila de análise" },
        { href: "/admin/projetos", label: "Projetos" },
        { href: "/admin/modelos", label: "Modelos" },
        { href: "/admin/biblioteca", label: "Biblioteca" },
        { href: "/admin/relatorios", label: "Uso de relatórios" },
        { href: "/admin/convites", label: "Usuários e convites" },
        { href: "/admin/auditoria", label: "Auditoria" },
      ]}
    >
      {children}
    </AppShell>
  );
}
