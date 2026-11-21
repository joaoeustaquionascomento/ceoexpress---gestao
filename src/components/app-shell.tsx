import Link from "next/link";
import { Logo } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";

type NavItem = { href: string; label: string };

export function AppShell({
  area,
  nav,
  user,
  children,
}: {
  area: string;
  nav: NavItem[];
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Início">
            <Logo width={96} />
            <span className="hidden border-l border-line pl-3 text-xs font-semibold uppercase tracking-[0.14em] text-rose sm:inline">
              {area}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted md:inline">{user.fullName}</span>
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-line py-4 text-center text-xs text-muted">
        CEOEXPRESS — Inteligência estratégica, execução e resultados em uma única plataforma.
      </footer>
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo width={168} />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-muted">CEOEXPRESS | Gestão Estratégica</p>
      </div>
    </main>
  );
}
