import Link from "next/link";
import { Logo } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type NavItem = { href: string; label: string };

async function unreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

export async function AppShell({
  area,
  nav,
  user,
  notificationsHref,
  children,
}: {
  area: string;
  nav: NavItem[];
  user: SessionUser;
  notificationsHref: string;
  children: React.ReactNode;
}) {
  const unread = await unreadCount();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 print:hidden z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Início">
            <Logo width={96} />
            <span className="hidden border-l border-line pl-3 text-xs font-semibold uppercase tracking-[0.14em] text-rose sm:inline">
              {area}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted md:inline">{user.fullName}</span>
            <Link
              href={notificationsHref}
              className="relative inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint"
              aria-label={unread ? `Avisos: ${unread} não lidos` : "Avisos"}
            >
              Avisos
              {unread > 0 && (
                <span className="ml-2 inline-flex min-w-6 justify-center rounded-full bg-rose px-1.5 text-xs leading-6 text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <form action="/sair" method="post">
              <button className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">
                Sair
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Menu principal" className="mx-auto max-w-6xl overflow-x-auto px-2">
          <ul className="flex gap-1 pb-2">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-muted hover:bg-tint hover:text-plum"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 print:max-w-none print:p-0">{children}</main>
      <footer className="print:hidden border-t border-line py-4 text-center text-xs text-muted">
        CEOEXPRESS — Inteligência estratégica, execução e resultados em uma única plataforma.
      </footer>
    </div>
  );
}
