"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMinutes,
  finalizeMinutesFile,
  prepareMinutesFile,
  saveMinutes,
  sendDecisionsToRegister,
  sendTasksToPlan,
  type MinutesResult,
} from "@/app/atas/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, inputClass, labelClass, primaryButton } from "@/components/ui";
import { fileToText } from "@/lib/atas/arquivo";
import { ATTACHMENT_EXTS } from "@/lib/atas/arquivo-regras";
import { splitList, type MinutesContent, type MinutesDecision, type MinutesTask } from "@/lib/atas/conteudo";
import { contentTypeFor, formatBytes, validateUpload } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold text-mauve hover:bg-tint disabled:cursor-wait disabled:opacity-60";
const fileInput =
  "block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-tint file:px-4 file:font-semibold file:text-plum";

function Feedback({ state }: { state: MinutesResult }) {
  if (state?.error) return <Alert tone="bad">{state.error}</Alert>;
  if (state?.ok) return <Alert tone="ok">{state.ok}</Alert>;
  return null;
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Envia o arquivo da ata (PDF/Word) e o deixa anexado ao encontro. */
async function uploadAttachment(projectId: string, meetingId: string, file: File, onStep: (s: string) => void): Promise<string | null> {
  const type = contentTypeFor(file.name, file.type);
  const problem = validateUpload({ name: file.name, size: file.size, type }, ATTACHMENT_EXTS);
  if (problem) return problem;
  onStep("Preparando o envio…");
  const prep = await prepareMinutesFile({ projectId, meetingId, fileName: file.name, size: file.size, type });
  if (!prep.ok) return prep.error;
  onStep(`Enviando ${formatBytes(file.size)}…`);
  const { error } = await createClient().storage.from("documentos").upload(prep.path, file, { contentType: type, upsert: false });
  if (error) return "O envio foi interrompido. Confira sua conexão e tente de novo.";
  onStep("Confirmando o recebimento…");
  const fin = await finalizeMinutesFile({
    projectId, meetingId, documentId: prep.documentId, path: prep.path, fileName: file.name, size: file.size, type, sha256: await sha256Hex(file),
  });
  return fin.ok ? null : fin.error;
}

type Mode = "regras" | "importar" | "branco" | "ia";

/** Como começar a ata: pela transcrição, por uma ata pronta ou em branco. */
export function MinutesStarter({
  area, projectId, meetingId, aiOn, hasMinutes,
}: { area: "admin" | "consultor"; projectId: string; meetingId: string; aiOn: boolean; hasMinutes: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transcricao" | "pronta" | "branco">("transcricao");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keepFile, setKeepFile] = useState(true);
  const [replace, setReplace] = useState(!hasMinutes);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const busy = step !== null;

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function readFile(f: File | null) {
    setError(null);
    setFile(f);
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (tab === "pronta" && (ext === "pdf" || ext === "doc")) {
      setText("");
      return; // PDF e .doc antigo: só anexados
    }
    try {
      setText(await fileToText(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    }
  }

  async function run(mode: Mode) {
    setError(null);
    if (!replace) return setError("Marque a opção de substituir a ata atual para continuar.");
    setSeconds(0);
    const ext = file?.name.split(".").pop()?.toLowerCase();
    const onlyAttach = mode === "importar" && file && (ext === "pdf" || ext === "doc");
    try {
      if (!onlyAttach) {
        setStep(mode === "ia" ? "A IA está escrevendo…" : "Montando a ata…");
        const res = await fetch("/api/atas/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, meetingId, area, mode, text }),
        });
        const json = (await res.json().catch(() => ({}))) as { href?: string; error?: string };
        if (!res.ok || !json.href) {
          setError(json.error ?? "Não foi possível montar a ata. Tente de novo.");
          return;
        }
      }
      if (mode === "importar" && file && (onlyAttach || keepFile) && ATTACHMENT_EXTS.includes(ext as (typeof ATTACHMENT_EXTS)[number])) {
        const problem = await uploadAttachment(projectId, meetingId, file, setStep);
        if (problem) {
          setError(onlyAttach ? problem : `A ata foi montada, mas o arquivo não foi anexado: ${problem}`);
          if (onlyAttach) return;
        }
      }
      router.push(`/${area}/projetos/${projectId}/agenda/${meetingId}/ata${onlyAttach ? "" : "?editar=1"}`);
      router.refresh();
    } catch {
      setError("A conexão caiu. Atualize a página para ver se a ata foi salva antes de tentar de novo.");
    } finally {
      setStep(null);
    }
  }

  const tabs = [
    { id: "transcricao", label: "Pela transcrição" },
    { id: "pronta", label: "Subir ata pronta" },
    { id: "branco", label: "Em branco" },
  ] as const;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Como montar a ata" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setText(""); setFile(null); setError(null); }}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${tab === t.id ? "bg-plum text-white" : "border border-line text-mauve hover:bg-tint"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alert tone="bad">{error}</Alert>}

      {tab === "transcricao" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Baixe a transcrição no Google Meet, Zoom ou Teams e escolha o arquivo, ou copie e cole o texto. O sistema separa quem participou, as frases que parecem decisões e as tarefas combinadas, com responsável e prazo quando forem ditos. Você confere e completa.
          </p>
          <div className="space-y-1">
            <label htmlFor="transcript-file" className={labelClass}>Arquivo da transcrição</label>
            <input id="transcript-file" type="file" accept=".txt,.vtt,.srt,.docx" onChange={(e) => void readFile(e.target.files?.[0] ?? null)} className={fileInput} />
            <p className="text-xs text-muted">Word (.docx), texto (.txt) ou legenda (.vtt, .srt). O arquivo não fica guardado.</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="transcript-text" className={labelClass}>Ou cole o texto aqui</label>
            <textarea id="transcript-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} placeholder={"Ana Souza: Bom dia a todos...\nCarlos: Eu fico de enviar o relatório até sexta."} />
            <p className="text-xs text-muted">{text ? `${text.length.toLocaleString("pt-BR")} caracteres` : "CPF, e-mails e telefones são mascarados automaticamente."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void run("regras")} disabled={busy} aria-busy={busy} className={`${primaryButton} w-full sm:w-auto`}>
              {busy ? `${step} ${seconds}s` : "Montar rascunho da ata"}
            </button>
            {aiOn && (
              <button type="button" onClick={() => void run("ia")} disabled={busy} className={`${secondaryButton} w-full sm:w-auto`}>
                Escrever com IA
              </button>
            )}
          </div>
          {busy && step?.startsWith("A IA") && <p className="text-sm text-muted">Pode levar de 1 a 3 minutos; não feche esta página.</p>}
        </div>
      )}

      {tab === "pronta" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Já tem a ata feita em outra ferramenta? Suba o arquivo ou cole o texto. Os títulos usuais (Participantes, Pauta, Resumo, Decisões, Encaminhamentos, Pendências) são reconhecidos e o conteúdo vai para os campos certos.
          </p>
          <div className="space-y-1">
            <label htmlFor="ready-file" className={labelClass}>Arquivo da ata</label>
            <input id="ready-file" type="file" accept=".docx,.txt,.md,.pdf,.doc" onChange={(e) => void readFile(e.target.files?.[0] ?? null)} className={fileInput} />
            <p className="text-xs text-muted">Word (.docx) e texto são lidos. PDF fica anexado ao encontro para baixar; se quiser os campos preenchidos, cole o texto também.</p>
          </div>
          {file && /\.(pdf|doc)$/i.test(file.name) ? (
            <Alert tone="info">O arquivo {file.name} será anexado à ata. O cliente só consegue baixar depois que você marcar a ata como revisada.</Alert>
          ) : (
            <>
              <div className="space-y-1">
                <label htmlFor="ready-text" className={labelClass}>Ou cole o texto da ata</label>
                <textarea id="ready-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} placeholder={"Participantes: Ana, Carlos\n\nDecisões\n- Aprovado o orçamento\n\nEncaminhamentos\n- Enviar proposta – Carlos – 15/12"} />
              </div>
              {file && /\.docx$/i.test(file.name) && (
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={keepFile} onChange={(e) => setKeepFile(e.target.checked)} className="h-5 w-5 accent-[var(--plum)]" />
                  Guardar também o arquivo original anexado à ata
                </label>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => void run("importar")}
            disabled={busy || (!text.trim() && !(file && /\.(pdf|doc)$/i.test(file.name)))}
            aria-busy={busy}
            className={`${primaryButton} w-full sm:w-auto`}
          >
            {busy ? `${step} ${seconds}s` : file && /\.(pdf|doc)$/i.test(file.name) ? "Anexar ata" : "Ler a ata"}
          </button>
        </div>
      )}

      {tab === "branco" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Abre um modelo organizado em participantes, pauta, resumo, assuntos, decisões, encaminhamentos e pendências, já com a pauta do encontro.</p>
          <button type="button" onClick={() => void run("branco")} disabled={busy} className={`${primaryButton} w-full sm:w-auto`}>
            {busy ? step : "Começar ata em branco"}
          </button>
        </div>
      )}

      {hasMinutes && (
        <label className="flex min-h-11 items-center gap-2 rounded-lg bg-warn-bg px-3 text-sm text-warn">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="h-5 w-5" />
          Substituir a ata atual (o que foi escrito nela será trocado)
        </label>
      )}
    </div>
  );
}

/** Anexar ou trocar o arquivo de uma ata que já existe. */
export function AttachmentForm({ projectId, meetingId, hasFile }: { projectId: string; meetingId: string; hasFile: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setDone(false);
        const f = new FormData(e.currentTarget).get("file");
        if (!(f instanceof File) || f.size === 0) return setError("Escolha um arquivo.");
        try {
          const problem = await uploadAttachment(projectId, meetingId, f, setStep);
          if (problem) return setError(problem);
          setDone(true);
          router.refresh();
        } catch {
          setError("O envio foi interrompido. Tente de novo.");
        } finally {
          setStep(null);
        }
      }}
    >
      {error && <Alert tone="bad">{error}</Alert>}
      {done && <Alert tone="ok">Arquivo anexado.</Alert>}
      <label htmlFor="att-file" className="sr-only">Arquivo da ata</label>
      <input id="att-file" name="file" type="file" accept={ATTACHMENT_EXTS.map((x) => "." + x).join(",")} className={fileInput} />
      <button type="submit" disabled={step !== null} className={`${secondaryButton} w-full`}>
        {step ?? (hasFile ? "Trocar arquivo" : "Anexar arquivo")}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
type Keyed<T> = T & { key: number };

function useList<T>(initial: T[]) {
  const [items, setItems] = useState<Keyed<T>[]>(initial.map((x, i) => ({ ...x, key: i })));
  const nextKey = () => items.reduce((m, x) => Math.max(m, x.key), -1) + 1;
  return {
    items,
    add: (x: T) => setItems((s) => [...s, { ...x, key: nextKey() }]),
    remove: (key: number) => setItems((s) => s.filter((x) => x.key !== key)),
    update: (key: number, patch: Partial<T>) => setItems((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x))),
  };
}

const strip = <T extends object>(x: Keyed<T>): T => {
  const { key: _key, ...rest } = x;
  void _key;
  return rest as unknown as T;
};

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-bad">
      Remover
    </button>
  );
}

export function MinutesEditor({
  projectId, meetingId, content, reviewed, internalMeeting,
}: { projectId: string; meetingId: string; content: MinutesContent; reviewed: boolean; internalMeeting: boolean }) {
  const [state, action] = useActionState(saveMinutes, undefined);
  const [participantes, setParticipantes] = useState(content.participantes.join("\n"));
  const [pauta, setPauta] = useState(content.pauta.join("\n"));
  const [resumo, setResumo] = useState(content.resumo);
  const [pendencias, setPendencias] = useState(content.pendencias.join("\n"));
  const assuntos = useList(content.assuntos);
  const decisoes = useList<MinutesDecision>(content.decisoes);
  const tarefas = useList<MinutesTask>(content.encaminhamentos);
  const [isReviewed, setReviewed] = useState(reviewed);

  const json = JSON.stringify({
    participantes: splitList(participantes.replace(/,/g, "\n")),
    pauta: splitList(pauta),
    resumo,
    assuntos: assuntos.items.map(strip),
    decisoes: decisoes.items.map(strip),
    encaminhamentos: tarefas.items.map(strip),
    pendencias: splitList(pendencias),
  });

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="meetingId" value={meetingId} />
      <input type="hidden" name="content" value={json} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="participantes" className={labelClass}>Participantes</label>
          <textarea id="participantes" rows={4} value={participantes} onChange={(e) => setParticipantes(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted">Um nome por linha.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="pauta" className={labelClass}>Pauta</label>
          <textarea id="pauta" rows={4} value={pauta} onChange={(e) => setPauta(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted">Um item por linha.</p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="resumo" className={labelClass}>Resumo da reunião</label>
        <textarea id="resumo" rows={4} value={resumo} onChange={(e) => setResumo(e.target.value)} className={inputClass} placeholder="Em poucas linhas: o objetivo da reunião e as principais conclusões." />
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold text-plum">Assuntos tratados</legend>
        {assuntos.items.map((a, i) => (
          <div key={a.key} className="space-y-2 rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor={`as-t-${a.key}`} className={labelClass}>Assunto {i + 1}</label>
                <input id={`as-t-${a.key}`} value={a.titulo} maxLength={200} onChange={(e) => assuntos.update(a.key, { titulo: e.target.value })} className={`${inputClass} mt-1`} />
              </div>
              <RemoveButton onClick={() => assuntos.remove(a.key)} label={`Remover assunto ${i + 1}`} />
            </div>
            <textarea rows={4} value={a.texto} aria-label={`O que foi tratado no assunto ${i + 1}`} onChange={(e) => assuntos.update(a.key, { texto: e.target.value })} className={inputClass} />
          </div>
        ))}
        <button type="button" onClick={() => assuntos.add({ titulo: "", texto: "" })} className={secondaryButton}>+ Adicionar assunto</button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold text-plum">Decisões</legend>
        {decisoes.items.length === 0 && <p className="text-sm text-muted">Nenhuma decisão registrada.</p>}
        {decisoes.items.map((d, i) => (
          <div key={d.key} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <div>
              <label htmlFor={`dc-${d.key}`} className={labelClass}>Decisão {i + 1} {d.decision_id && <Badge tone="ok">No registro</Badge>}</label>
              <textarea id={`dc-${d.key}`} rows={2} value={d.texto} onChange={(e) => decisoes.update(d.key, { texto: e.target.value })} className={`${inputClass} mt-1`} />
            </div>
            <div>
              <label htmlFor={`dr-${d.key}`} className={labelClass}>Quem decidiu</label>
              <input id={`dr-${d.key}`} value={d.responsavel} onChange={(e) => decisoes.update(d.key, { responsavel: e.target.value })} className={`${inputClass} mt-1`} />
            </div>
            <RemoveButton onClick={() => decisoes.remove(d.key)} label={`Remover decisão ${i + 1}`} />
          </div>
        ))}
        <button type="button" onClick={() => decisoes.add({ texto: "", responsavel: "", decision_id: null })} className={secondaryButton}>+ Adicionar decisão</button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold text-plum">Encaminhamentos (o quê, quem e até quando)</legend>
        {tarefas.items.length === 0 && <p className="text-sm text-muted">Nenhum encaminhamento registrado.</p>}
        {tarefas.items.map((t, i) => (
          <div key={t.key} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_180px_160px_auto] sm:items-end">
            <div>
              <label htmlFor={`tq-${t.key}`} className={labelClass}>O quê {t.action_id && <Badge tone="ok">No plano</Badge>}</label>
              <textarea id={`tq-${t.key}`} rows={2} value={t.oque} maxLength={300} onChange={(e) => tarefas.update(t.key, { oque: e.target.value })} className={`${inputClass} mt-1`} />
            </div>
            <div>
              <label htmlFor={`tr-${t.key}`} className={labelClass}>Responsável</label>
              <input id={`tr-${t.key}`} value={t.responsavel} onChange={(e) => tarefas.update(t.key, { responsavel: e.target.value })} className={`${inputClass} mt-1`} />
            </div>
            <div>
              <label htmlFor={`tp-${t.key}`} className={labelClass}>Prazo</label>
              <input id={`tp-${t.key}`} type="date" value={t.prazo ?? ""} onChange={(e) => tarefas.update(t.key, { prazo: e.target.value || null })} className={`${inputClass} mt-1`} />
            </div>
            <RemoveButton onClick={() => tarefas.remove(t.key)} label={`Remover encaminhamento ${i + 1}`} />
          </div>
        ))}
        <button type="button" onClick={() => tarefas.add({ oque: "", responsavel: "", prazo: null, action_id: null })} className={secondaryButton}>+ Adicionar encaminhamento</button>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="pendencias" className={labelClass}>Pendências e pontos em aberto</label>
        <textarea id="pendencias" rows={3} value={pendencias} onChange={(e) => setPendencias(e.target.value)} className={inputClass} />
        <p className="text-xs text-muted">Um item por linha.</p>
      </div>

      <div className="space-y-2 rounded-lg bg-canvas p-3">
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="revisada" checked={isReviewed} onChange={(e) => setReviewed(e.target.checked)} className="size-5" />
          Revisei a ata e está pronta
        </label>
        <p className="text-xs text-muted">
          {internalMeeting
            ? "Este encontro é interno: mesmo revisada, o cliente não vê a ata."
            : "Revisada, a ata passa a aparecer para o cliente na agenda do projeto."}
        </p>
      </div>
      <SubmitButton pendingText="Salvando…">Salvar ata</SubmitButton>
    </form>
  );
}

export function SendItemsForm({
  kind, projectId, meetingId, items,
}: {
  kind: "plano" | "decisoes";
  projectId: string;
  meetingId: string;
  items: { label: string; done: boolean }[];
}) {
  const [state, action] = useActionState(kind === "plano" ? sendTasksToPlan : sendDecisionsToRegister, undefined);
  const pending = items.filter((i) => !i.done).length;
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="meetingId" value={meetingId} />
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i}>
            <label className={`flex min-h-11 items-start gap-3 rounded-lg p-2 text-sm ${it.done ? "text-muted" : "bg-canvas"}`}>
              <input type="checkbox" name="item" value={i} defaultChecked={!it.done} disabled={it.done} className="mt-0.5 h-5 w-5 accent-[var(--plum)]" />
              <span>
                {it.label}
                {it.done && <span className="ml-1"><Badge tone="ok">{kind === "plano" ? "No plano" : "No registro"}</Badge></span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {pending > 0 && (
        <SubmitButton pendingText="Enviando…">{kind === "plano" ? "Criar ações no plano" : "Levar ao registro de decisões"}</SubmitButton>
      )}
    </form>
  );
}

export function DeleteMinutesForm({ area, projectId, meetingId }: { area: string; projectId: string; meetingId: string }) {
  const [state, action] = useActionState(deleteMinutes, undefined);
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm print:hidden">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-bad">Excluir esta ata…</summary>
      <form action={action} className="mt-2 space-y-3">
        <Feedback state={state} />
        <input type="hidden" name="area" value={area} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="meetingId" value={meetingId} />
        <p className="text-muted">A ata é apagada. Ações e decisões já criadas a partir dela continuam no plano e no registro.</p>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-bad px-4 font-semibold text-white hover:opacity-90">Sim, excluir</button>
      </form>
    </details>
  );
}
