import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");
  return (
    <AppShell
      area="Área administrativa"
      user={user}
      nav={[
        { href: "/admin", label: "Carteira" },
        { href: "/admin/empresas", label: "Empresas" },
        { href: "/admin/projetos", label: "Projetos" },
        { href: "/admin/convites", label: "Usuários e convites" },
      ]}
    >
      {children}
    </AppShell>
  );
}
