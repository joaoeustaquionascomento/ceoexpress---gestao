"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReport, saveReport, type ReportResult } from "@/app/relatorios/actions";
import { Alert, inputClass, labelClass, primaryButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ReportContent } from "@/lib/relatorios/conteudo";

function Feedback({ state }: { state: ReportResult }) {
  if (state?.error) return <Alert tone="bad">{state.error}</Alert>;
  if (state?.ok) return <Alert tone="ok">{state.ok}</Alert>;
  return null;
}

/** Botão que monta o relatório (por regras ou com IA) e abre o rascunho quando fica pronto. */
export function GenerateReportButton({
  area, projectId, toolId, label, engine = "regras", secondary = false,
}: { area: "admin" | "consultor"; projectId: string; toolId?: string; label: string; engine?: "regras" | "ia"; secondary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run() {
    setBusy(true);
    setError(null);
    setSeconds(0);
    try {
      const res = await fetch("/api/relatorios/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, toolId: toolId ?? null, area, engine }),
      });
      const json = (await res.json().catch(() => ({}))) as { href?: string; error?: string };
      if (!res.ok || !json.href) {
        setError(json.error ?? "Não foi possível gerar. Tente de novo.");
        setBusy(false);
        return;
      }
      router.push(json.href);
    } catch {
      setError("A conexão caiu durante a geração. Confira a lista de relatórios antes de tentar de novo.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <Alert tone="bad">{error}</Alert>}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        aria-busy={busy}
        className={secondary
          ? "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 font-semibold text-mauve hover:bg-tint disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          : `${primaryButton} w-full sm:w-auto`}
      >
        {busy ? `Gerando… ${seconds}s` : label}
      </button>
      {busy && engine === "ia" && <p className="text-sm text-muted">A IA está lendo os dados e escrevendo. Pode levar de 1 a 3 minutos; não feche esta página.</p>}
    </div>
  );
}

type Section = { key: number; titulo: string; texto: string };

export function ReportEditor({
  area, projectId, reportId, title, content, reviewed, shared,
}: {
  area: string; projectId: string; reportId: string; title: string; content: ReportContent; reviewed: boolean; shared: boolean;
}) {
  const [state, action] = useActionState(saveReport, undefined);
  const [sections, setSections] = useState<Section[]>(content.secoes.map((s, i) => ({ key: i, ...s })));
  const [isReviewed, setReviewed] = useState(reviewed);
  const [isShared, setShared] = useState(shared);
  const nextKey = () => sections.reduce((m, s) => Math.max(m, s.key), -1) + 1;
  const move = (i: number, d: -1 | 1) =>
    setSections((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  return (
    <form action={action} className="space-y-5">
      <Feedback state={state} />
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="reportId" value={reportId} />
      <div>
        <label htmlFor="title" className={labelClass}>Título</label>
        <input id="title" name="title" required maxLength={200} defaultValue={title} className={`${inputClass} mt-1`} />
      </div>
      <div>
        <label htmlFor="resumo" className={labelClass}>Resumo executivo</label>
        <textarea id="resumo" name="resumo" rows={5} defaultValue={content.resumo} className={`${inputClass} mt-1`} />
      </div>

      {sections.map((s, i) => (
        <fieldset key={s.key} className="space-y-2 rounded-lg border border-line p-3">
          <legend className="sr-only">Seção {i + 1}</legend>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`st-${s.key}`} className={labelClass}>Seção {i + 1}</label>
              <input id={`st-${s.key}`} name="secao_titulo" defaultValue={s.titulo} maxLength={200} className={`${inputClass} mt-1`} />
            </div>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40" aria-label="Subir seção">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40" aria-label="Descer seção">↓</button>
            <button type="button" onClick={() => setSections((x) => x.filter((y) => y.key !== s.key))} className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-bad">Remover</button>
          </div>
          <textarea name="secao_texto" rows={8} defaultValue={s.texto} aria-label={`Texto da seção ${i + 1}`} className={inputClass} />
        </fieldset>
      ))}
      <button type="button" onClick={() => setSections((x) => [...x, { key: nextKey(), titulo: "", texto: "" }])} className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-mauve hover:bg-tint">
        + Adicionar seção
      </button>
      <p className="text-xs text-muted">Dica: parágrafos separados por uma linha em branco; listas com uma linha por item começando por &quot;- &quot;.</p>

      <div>
        <label htmlFor="lacunas" className={labelClass}>Informações que faltam (só a consultoria vê)</label>
        <textarea id="lacunas" name="lacunas" rows={4} defaultValue={content.lacunas.map((l) => `- ${l}`).join("\n")} className={`${inputClass} mt-1`} />
      </div>

      <div className="space-y-2 rounded-lg bg-canvas p-3">
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="revisado" checked={isReviewed} onChange={(e) => { setReviewed(e.target.checked); if (!e.target.checked) setShared(false); }} className="size-5" />
          Revisei o conteúdo e está pronto
        </label>
        <label className={`flex min-h-11 items-center gap-3 text-sm font-semibold ${isReviewed ? "" : "opacity-50"}`}>
          <input type="checkbox" name="shared" checked={isShared} disabled={!isReviewed} onChange={(e) => setShared(e.target.checked)} className="size-5" />
          Compartilhar com o cliente
        </label>
        {!isReviewed && <p className="text-xs text-muted">O relatório só pode ser compartilhado depois de revisado.</p>}
      </div>
      <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
    </form>
  );
}

export function DeleteReportForm({ area, projectId, reportId }: { area: string; projectId: string; reportId: string }) {
  const [state, action] = useActionState(deleteReport, undefined);
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm print:hidden">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-bad">Excluir este relatório…</summary>
      <form action={action} className="mt-2 space-y-3">
        <Feedback state={state} />
        <input type="hidden" name="area" value={area} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="reportId" value={reportId} />
        <p className="text-muted">O relatório é apagado e não pode ser recuperado.</p>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-bad px-4 font-semibold text-white hover:opacity-90">Sim, excluir</button>
      </form>
    </details>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint print:hidden">
      Imprimir ou salvar em PDF
    </button>
  );
}
