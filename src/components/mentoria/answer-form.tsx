"use client";
import { useMemo, useState, useTransition } from "react";
import { saveAnswers } from "@/app/avaliacao/actions";
import { Alert, primaryButton } from "@/components/ui";
import type { Instrument } from "@/lib/mentoria/tipos";

const FREQ = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"];
const DESIRED = "desejo:";

type Page = { key: string; title: string; hint?: string; items: { id: string; text: string }[]; desired?: string; scale: "freq" | "nota" };

function pagesOf(instr: Instrument): Page[] {
  const pages: Page[] = [];
  if (instr.index) pages.push({ key: "indice", title: instr.index.label, hint: instr.index.instruction, items: instr.index.items, scale: "freq" });
  for (const d of instr.dimensions) {
    pages.push({
      key: d.id,
      title: d.label,
      hint: d.description,
      items: d.items,
      scale: instr.scale,
      ...(instr.asksDesired ? { desired: DESIRED + d.id } : {}),
    });
  }
  return pages;
}

function Choice({ name, value, onChange, scale, label }: { name: string; value?: number; onChange: (v: number) => void; scale: "freq" | "nota"; label: string }) {
  const opts = scale === "freq" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className={scale === "freq" ? "grid grid-cols-5 gap-1.5" : "grid grid-cols-6 gap-1.5 sm:grid-cols-11 sm:gap-1"}>
        {opts.map((o) => {
          const on = value === o;
          return (
            <label
              key={o}
              className={`flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border text-center text-sm font-semibold transition ${
                on ? "border-plum bg-plum text-white" : "border-line bg-surface text-ink hover:border-mauve"
              }`}
            >
              <input type="radio" name={name} value={o} checked={on} onChange={() => onChange(o)} className="sr-only" />
              <span>{o}</span>
              {scale === "freq" && <span className={`hidden text-[10px] font-normal sm:block ${on ? "text-white" : "text-muted"}`}>{FREQ[o - 1]}</span>}
            </label>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{scale === "freq" ? "1 = Nunca" : "0 = nada"}</span>
        <span>{scale === "freq" ? "5 = Sempre" : "10 = totalmente"}</span>
      </div>
    </fieldset>
  );
}

export function AnswerForm({
  token,
  instrument,
  firstName,
  initialAnswers,
  consented,
}: {
  token: string;
  instrument: Instrument;
  firstName: string;
  initialAnswers: Record<string, number>;
  consented: boolean;
}) {
  const pages = useMemo(() => pagesOf(instrument), [instrument]);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [consent, setConsent] = useState(consented);
  const [step, setStep] = useState(-1); // -1 = boas-vindas
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const total = pages.reduce((n, p) => n + p.items.length + (p.desired ? 1 : 0), 0);
  const answered = pages.reduce((n, p) => n + p.items.filter((i) => answers[i.id] !== undefined).length + (p.desired && answers[p.desired] !== undefined ? 1 : 0), 0);
  const page = step >= 0 ? pages[step] : null;
  const pageComplete = page ? page.items.every((i) => answers[i.id] !== undefined) && (!page.desired || answers[page.desired] !== undefined) : true;

  function set(id: string, v: number) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  function go(next: number, submit = false) {
    setError(null);
    start(async () => {
      const res = await saveAnswers(token, answers, consent, submit);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.done) {
        setDone(true);
        return;
      }
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold text-plum">Obrigado, {firstName}!</h1>
        <p className="mt-2 text-muted">Suas respostas foram enviadas. Seu mentor vai preparar o relatório e conversar com você sobre o resultado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose">Avaliação de mentoria</p>
      <h1 className="mt-1 text-2xl font-semibold text-plum">{instrument.name}</h1>

      {step >= 0 && (
        <div className="mt-4" aria-label="Progresso">
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-mauve transition-all" style={{ width: `${Math.round((answered / total) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Parte {step + 1} de {pages.length} · {answered} de {total} respostas
          </p>
        </div>
      )}

      {error && <div className="mt-4"><Alert tone="bad">{error}</Alert></div>}

      {step === -1 && (
        <div className="mt-4 space-y-4">
          <p>Olá{firstName ? `, ${firstName}` : ""}! {instrument.intro}</p>
          <p className="text-sm text-muted">São {total} perguntas, cerca de {instrument.minutes} minutos. Suas respostas ficam salvas a cada parte: se precisar parar, é só abrir o mesmo link depois.</p>
          <div className="rounded-lg bg-tint p-4 text-sm">
            <p className="font-semibold text-plum">Uso das suas respostas</p>
            <p className="mt-1">
              Suas respostas e o relatório gerado são dados pessoais. Eles ficam guardados com segurança no sistema da CEOEXPRESS e são usados
              apenas no seu processo de mentoria. Só o seu mentor tem acesso às respostas; o relatório só é compartilhado com você, e com mais
              ninguém sem a sua autorização. Você pode pedir a exclusão a qualquer momento ao seu mentor.
            </p>
            <label className="mt-3 flex min-h-11 items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-plum" />
              <span>Li e concordo com o uso das minhas respostas na mentoria.</span>
            </label>
          </div>
          <button type="button" className={primaryButton} disabled={!consent || pending} onClick={() => go(0)}>
            {pending ? "Abrindo..." : answered > 0 ? "Continuar de onde parei" : "Começar"}
          </button>
        </div>
      )}

      {page && (
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-plum">{page.title}</h2>
            <p className="text-sm text-muted">{page.key === "indice" ? page.hint : instrument.instruction}</p>
          </div>
          {page.items.map((it, n) => (
            <div key={it.id} className="space-y-2">
              <p className="font-medium">
                <span className="text-muted">{n + 1}. </span>
                {it.text}
              </p>
              <Choice name={it.id} value={answers[it.id]} onChange={(v) => set(it.id, v)} scale={page.scale} label={it.text} />
            </div>
          ))}
          {page.desired && (
            <div className="space-y-2 rounded-lg bg-tint p-4">
              <p className="font-medium">Onde você quer estar em &quot;{page.title}&quot; daqui a 90 dias?</p>
              <Choice name={page.desired} value={answers[page.desired]} onChange={(v) => set(page.desired!, v)} scale="nota" label="Nota desejada em 90 dias" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-semibold text-mauve hover:bg-tint"
              onClick={() => setStep(step - 1)}
              disabled={pending}
            >
              Voltar
            </button>
            {step < pages.length - 1 ? (
              <button type="button" className={primaryButton} disabled={!pageComplete || pending} onClick={() => go(step + 1)}>
                {pending ? "Salvando..." : "Continuar"}
              </button>
            ) : (
              <button type="button" className={primaryButton} disabled={!pageComplete || pending || answered < total} onClick={() => go(step, true)}>
                {pending ? "Enviando..." : "Enviar respostas"}
              </button>
            )}
          </div>
          {!pageComplete && <p className="text-right text-xs text-muted">Responda todas as perguntas desta parte para continuar.</p>}
        </div>
      )}
    </div>
  );
}
