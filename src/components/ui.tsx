import Link from "next/link";
import Image from "next/image";

export function Logo({ width = 132 }: { width?: number }) {
  return (
    <Image src="/ceoexpress-logo-600.png" alt="CEOEXPRESS" width={width} height={Math.round(width * 0.4713)} priority />
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-semibold text-plum sm:text-3xl">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-muted">{children}</div>}
    </header>
  );
}

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-mauve hover:text-plum"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

const tones = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-tint text-plum",
  neutral: "bg-canvas text-muted border border-line",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Alert({ tone = "info", children }: { tone?: "ok" | "bad" | "info" | "warn"; children: React.ReactNode }) {
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-plum">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line bg-canvas px-4 py-6 text-center text-muted">{children}</p>;
}

export const inputClass =
  "block w-full min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-soft-rose focus:border-mauve focus:outline-none";
export const labelClass = "block text-sm font-semibold text-ink";
export const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-plum px-5 py-2 font-semibold text-white hover:bg-mauve disabled:cursor-wait disabled:opacity-70";
