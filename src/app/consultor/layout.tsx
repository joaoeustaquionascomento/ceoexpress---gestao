import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function ConsultorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("consultant", "admin");
  return (
    <AppShell area="Área dos consultores" user={user}
      notificationsHref="/consultor/notificacoes" nav={[{ href: "/consultor", label: "Meus projetos" }]}>
      {children}
    </AppShell>
  );
}
