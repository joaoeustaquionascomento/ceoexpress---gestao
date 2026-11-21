import { Logo } from "@/components/ui";

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
