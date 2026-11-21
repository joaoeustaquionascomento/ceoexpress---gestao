import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("client");
  return (
    <AppShell area="Área do Cliente" user={user}
      notificationsHref="/cliente/notificacoes" nav={[{ href: "/cliente", label: "Início" }]}>
      {children}
    </AppShell>
  );
}
