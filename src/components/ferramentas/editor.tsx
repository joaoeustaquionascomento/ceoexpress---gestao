"use client";
import { useActionState, useState } from "react";
import { createTool, deleteTool, saveTool, toolToAction, type ToolResult } from "@/app/ferramentas/actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ToolView } from "@/components/ferramentas/views";
import {
  BOARDS,
  BSC_PERSPECTIVES,
  TOOL_GROUPS,
  isBoardKind,
  krProgress,
  type BoardData,
  type BoardKind,
  type BscData,
  type OkrData,
  GUT_SCALE,
  ISHIKAWA_CATS,
  SWOT_QUADRANTS,
  TOOLS,
  gutScore,
  type GutData,
  type IshikawaData,
  type ParetoData,
  type SwotData,
  type TextItem,
  type ToolData,
  type ToolKind,
  type WhyData,
} from "@/lib/ferramentas";

const newId = () => Math.random().toString(36).slice(2, 10);
const small = "min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint";
const remove = "min-h-11 min-w-11 rounded-lg px-2 text-lg text-muted hover:bg-bad-bg hover:text-bad";

function Feedback({ state }: { state: ToolResult }) {
  return (
    <>
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
    </>
  );
}

/** Lista simples de itens de texto: editar, remover, adicionar. */
function ListEditor({ items, onChange, label, placeholder }: { items: TextItem[]; onChange: (v: TextItem[]) => void; label: string; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: newId(), text }]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {items.map((it, n) => (
          <li key={it.id} className="flex items-center gap-1">
            <label className="sr-only" htmlFor={`it-${it.id}`}>{label} {n + 1}</label>
            <input
              id={`it-${it.id}`}
              value={it.text}
              onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
              className={inputClass}
            />
            <button type="button" aria-label={`Remover: ${it.text}`} onClick={() => onChange(items.filter((x) => x.id !== it.id))} className={remove}>×</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <label className="sr-only" htmlFor={`novo-${label}`}>Novo item em {label}</label>
        <input
          id={`novo-${label}`}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={inputClass}
        />
        <button type="button" onClick={add} className={small}>Adicionar</button>
      </div>
    </div>
  );
}

function SwotEditor({ data, set }: { data: SwotData; set: (d: SwotData) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SWOT_QUADRANTS.map((q) => (
        <fieldset key={q.key} className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <legend className="px-1 font-semibold text-plum">{q.label}</legend>
          <p className="text-xs text-muted">{q.hint}</p>
          <ListEditor label={q.label} placeholder="Escreva e tecle Enter" items={data[q.key]} onChange={(v) => set({ ...data, [q.key]: v })} />
        </fieldset>
      ))}
    </div>
  );
}

function GutEditor({ data, set }: { data: GutData; set: (d: GutData) => void }) {
  const upd = (id: string, patch: Partial<GutData["items"][number]>) =>
    set({ items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {data.items.map((i, n) => (
          <li key={i.id} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center gap-1">
              <label className="sr-only" htmlFor={`g-${i.id}`}>Problema {n + 1}</label>
              <input id={`g-${i.id}`} value={i.text} placeholder="Descreva o problema" onChange={(e) => upd(i.id, { text: e.target.value })} className={inputClass} />
              <button type="button" aria-label="Remover problema" onClick={() => set({ items: data.items.filter((x) => x.id !== i.id) })} className={remove}>×</button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              {(["g", "u", "t"] as const).map((k) => (
                <label key={k} className="space-y-1 text-xs">
                  <span className="block font-semibold">{GUT_SCALE[k].label}</span>
                  <select value={i[k]} onChange={(e) => upd(i.id, { [k]: Number(e.target.value) })} className={inputClass}>
                    {GUT_SCALE[k].levels.map((l, idx) => <option key={idx} value={idx + 1}>{idx + 1} · {l}</option>)}
                  </select>
                </label>
              ))}
              <p className="col-span-3 text-sm sm:col-span-1 sm:pb-3">Pontuação: <span className="font-semibold tabular-nums">{gutScore(i)}</span></p>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={small} onClick={() => set({ items: [...data.items, { id: newId(), text: "", g: 3, u: 3, t: 3 }] })}>
        Adicionar problema
      </button>
    </div>
  );
}

function WhyEditor({ data, set }: { data: WhyData; set: (d: WhyData) => void }) {
  const whys = data.porques.length ? data.porques : [""];
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="problema" className={labelClass}>Problema (o fato observado)</label>
        <textarea id="problema" rows={2} value={data.problema} onChange={(e) => set({ ...data, problema: e.target.value })} className={inputClass} />
      </div>
      {whys.map((w, i) => (
        <div key={i} className="space-y-1" style={{ marginLeft: `${Math.min(i, 5) * 12}px` }}>
          <label htmlFor={`pq-${i}`} className={labelClass}>Por quê {i + 1}?</label>
          <div className="flex gap-1">
            <textarea id={`pq-${i}`} rows={2} value={w} onChange={(e) => set({ ...data, porques: whys.map((x, n) => (n === i ? e.target.value : x)) })} className={inputClass} />
            {whys.length > 1 && (
              <button type="button" aria-label={`Remover por quê ${i + 1}`} onClick={() => set({ ...data, porques: whys.filter((_, n) => n !== i) })} className={remove}>×</button>
            )}
          </div>
        </div>
      ))}
      {whys.length < 7 && <button type="button" className={small} onClick={() => set({ ...data, porques: [...whys, ""] })}>Mais um porquê</button>}
      <div className="space-y-1">
        <label htmlFor="causa" className={labelClass}>Causa raiz</label>
        <textarea id="causa" rows={2} value={data.causa_raiz} onChange={(e) => set({ ...data, causa_raiz: e.target.value })} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="contra" className={labelClass}>Contramedida (o que muda para não repetir)</label>
        <textarea id="contra" rows={2} value={data.contramedida} onChange={(e) => set({ ...data, contramedida: e.target.value })} className={inputClass} />
      </div>
    </div>
  );
}

function IshikawaEditor({ data, set }: { data: IshikawaData; set: (d: IshikawaData) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="efeito" className={labelClass}>Efeito (o problema)</label>
        <input id="efeito" value={data.efeito} onChange={(e) => set({ ...data, efeito: e.target.value })} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ISHIKAWA_CATS.map((c) => (
          <fieldset key={c.key} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <legend className="px-1 font-semibold text-plum">{c.label}</legend>
            <p className="text-xs text-muted">{c.hint}</p>
            <ListEditor label={c.label} placeholder="Possível causa" items={data.causas[c.key]} onChange={(v) => set({ ...data, causas: { ...data.causas, [c.key]: v } })} />
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function ParetoEditor({ data, set }: { data: ParetoData; set: (d: ParetoData) => void }) {
  const upd = (id: string, patch: Partial<ParetoData["items"][number]>) =>
    set({ ...data, items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1">
        <label htmlFor="unidade" className={labelClass}>Unidade</label>
        <input id="unidade" value={data.unidade} placeholder="Ex.: ocorrências, horas, R$" onChange={(e) => set({ ...data, unidade: e.target.value })} className={inputClass} />
      </div>
      <ul className="space-y-1">
        {data.items.map((i, n) => (
          <li key={i.id} className="grid grid-cols-[1fr_7rem_auto] gap-1">
            <label className="sr-only" htmlFor={`pc-${i.id}`}>Categoria {n + 1}</label>
            <input id={`pc-${i.id}`} value={i.categoria} placeholder="Categoria" onChange={(e) => upd(i.id, { categoria: e.target.value })} className={inputClass} />
            <label className="sr-only" htmlFor={`pv-${i.id}`}>Valor {n + 1}</label>
            <input id={`pv-${i.id}`} type="number" min={0} step="any" inputMode="decimal" value={i.valor || ""} placeholder="0"
              onChange={(e) => upd(i.id, { valor: Number(e.target.value) || 0 })} className={inputClass} />
            <button type="button" aria-label="Remover categoria" onClick={() => set({ ...data, items: data.items.filter((x) => x.id !== i.id) })} className={remove}>×</button>
          </li>
        ))}
      </ul>
      <button type="button" className={small} onClick={() => set({ ...data, items: [...data.items, { id: newId(), categoria: "", valor: 0 }] })}>
        Adicionar categoria
      </button>
    </div>
  );
}

function BoardEditor({ kind, data, set }: { kind: BoardKind; data: BoardData; set: (d: BoardData) => void }) {
  const cfg = BOARDS[kind];
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="foco" className={labelClass}>{cfg.foco.label}</label>
        <input id="foco" value={data.foco} placeholder={cfg.foco.placeholder} onChange={(e) => set({ ...data, foco: e.target.value })} className={inputClass} />
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 ${cfg.columns === 3 ? "lg:grid-cols-3" : ""}`}>
        {cfg.sections.map((sec) => (
          <fieldset key={sec.key} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <legend className="px-1 font-semibold text-plum">{sec.label}</legend>
            <p className="text-xs text-muted">{sec.hint}</p>
            {cfg.rating && (
              <label className="block space-y-1 text-xs">
                <span className="font-semibold">{cfg.rating.label}</span>
                <select
                  value={data.notas[sec.key] ?? 0}
                  onChange={(e) => set({ ...data, notas: { ...data.notas, [sec.key]: Number(e.target.value) } })}
                  className={inputClass}
                >
                  <option value={0}>Não avaliado</option>
                  {cfg.rating.levels.map((l, i) => <option key={i} value={i + 1}>{i + 1} · {l}</option>)}
                </select>
              </label>
            )}
            <ListEditor
              label={sec.label}
              placeholder="Escreva e tecle Enter"
              items={data.secoes[sec.key] ?? []}
              onChange={(v) => set({ ...data, secoes: { ...data.secoes, [sec.key]: v } })}
            />
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function BscEditor({ data, set }: { data: BscData; set: (d: BscData) => void }) {
  const setPer = (key: keyof BscData["perspectivas"], list: BscData["perspectivas"][typeof key]) =>
    set({ ...data, perspectivas: { ...data.perspectivas, [key]: list } });
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="visao" className={labelClass}>Visão ou foco estratégico do período</label>
        <textarea id="visao" rows={2} value={data.visao} onChange={(e) => set({ ...data, visao: e.target.value })} className={inputClass} />
      </div>
      {BSC_PERSPECTIVES.map((p) => {
        const list = data.perspectivas[p.key];
        const upd = (id: string, patch: Partial<(typeof list)[number]>) => setPer(p.key, list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
        return (
          <fieldset key={p.key} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <legend className="px-1 font-semibold text-plum">{p.label}</legend>
            <p className="text-xs text-muted">{p.hint}</p>
            <ul className="space-y-2">
              {list.map((o, n) => (
                <li key={o.id} className="grid gap-1 rounded-lg bg-canvas p-2 sm:grid-cols-[2fr_1.5fr_1fr_auto]">
                  <label className="sr-only" htmlFor={`bo-${o.id}`}>Objetivo {n + 1}</label>
                  <input id={`bo-${o.id}`} value={o.text} placeholder="Objetivo" onChange={(e) => upd(o.id, { text: e.target.value })} className={inputClass} />
                  <label className="sr-only" htmlFor={`bi-${o.id}`}>Indicador</label>
                  <input id={`bi-${o.id}`} value={o.indicador} placeholder="Indicador" onChange={(e) => upd(o.id, { indicador: e.target.value })} className={inputClass} />
                  <label className="sr-only" htmlFor={`bm-${o.id}`}>Meta</label>
                  <input id={`bm-${o.id}`} value={o.meta} placeholder="Meta e prazo" onChange={(e) => upd(o.id, { meta: e.target.value })} className={inputClass} />
                  <button type="button" aria-label={`Remover objetivo ${o.text}`} onClick={() => setPer(p.key, list.filter((x) => x.id !== o.id))} className={remove}>×</button>
                </li>
              ))}
            </ul>
            <button type="button" className={small} onClick={() => setPer(p.key, [...list, { id: newId(), text: "", indicador: "", meta: "" }])}>
              Adicionar objetivo
            </button>
          </fieldset>
        );
      })}
    </div>
  );
}

function OkrEditor({ data, set }: { data: OkrData; set: (d: OkrData) => void }) {
  const setObj = (id: string, patch: Partial<OkrData["objetivos"][number]>) =>
    set({ ...data, objetivos: data.objetivos.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const numInput = (id: string, label: string, value: number, onChange: (v: number) => void) => (
    <label className="space-y-1 text-xs">
      <span className="block font-semibold">{label}</span>
      <input id={id} type="number" step="any" inputMode="decimal" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className={inputClass} />
    </label>
  );
  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-1">
        <label htmlFor="periodo" className={labelClass}>Período</label>
        <input id="periodo" value={data.periodo} placeholder="Ex.: 1º trimestre" onChange={(e) => set({ ...data, periodo: e.target.value })} className={inputClass} />
      </div>
      {data.objetivos.map((o, n) => (
        <fieldset key={o.id} className="space-y-3 rounded-xl border border-line bg-surface p-3">
          <legend className="px-1 font-semibold text-plum">Objetivo {n + 1}</legend>
          <div className="flex items-center gap-1">
            <label className="sr-only" htmlFor={`ob-${o.id}`}>Objetivo {n + 1}</label>
            <input id={`ob-${o.id}`} value={o.text} placeholder="Objetivo qualitativo" onChange={(e) => setObj(o.id, { text: e.target.value })} className={inputClass} />
            <button type="button" aria-label="Remover objetivo" onClick={() => set({ ...data, objetivos: data.objetivos.filter((x) => x.id !== o.id) })} className={remove}>×</button>
          </div>
          <ul className="space-y-2">
            {o.krs.map((k, j) => {
              const upd = (patch: Partial<typeof k>) => setObj(o.id, { krs: o.krs.map((x) => (x.id === k.id ? { ...x, ...patch } : x)) });
              return (
                <li key={k.id} className="space-y-2 rounded-lg bg-canvas p-2">
                  <div className="flex items-center gap-1">
                    <label className="sr-only" htmlFor={`kr-${k.id}`}>Resultado-chave {j + 1}</label>
                    <input id={`kr-${k.id}`} value={k.text} placeholder="Resultado-chave mensurável" onChange={(e) => upd({ text: e.target.value })} className={inputClass} />
                    <button type="button" aria-label="Remover resultado-chave" onClick={() => setObj(o.id, { krs: o.krs.filter((x) => x.id !== k.id) })} className={remove}>×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                    {numInput(`kri-${k.id}`, "Partida", k.inicial, (v) => upd({ inicial: v }))}
                    {numInput(`krm-${k.id}`, "Meta", k.meta, (v) => upd({ meta: v }))}
                    {numInput(`kra-${k.id}`, "Atual", k.atual, (v) => upd({ atual: v }))}
                    <p className="col-span-3 text-sm sm:col-span-1 sm:pb-3">Progresso: <span className="font-semibold tabular-nums">{krProgress(k)}%</span></p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className={small} onClick={() => setObj(o.id, { krs: [...o.krs, { id: newId(), text: "", inicial: 0, meta: 100, atual: 0 }] })}>
            Adicionar resultado-chave
          </button>
        </fieldset>
      ))}
      <button type="button" className={small} onClick={() => set({ ...data, objetivos: [...data.objetivos, { id: newId(), text: "", krs: [] }] })}>
        Adicionar objetivo
      </button>
    </div>
  );
}

export function ToolEditor({
  area, projectId, toolId, kind, initial, title, notes, shared,
}: {
  area: string;
  projectId: string;
  toolId: string;
  kind: ToolKind;
  initial: ToolData[ToolKind];
  title: string;
  notes: string;
  shared: boolean;
}) {
  const [state, action] = useActionState(saveTool, undefined);
  const [data, setData] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const set = (d: ToolData[ToolKind]) => {
    setData(d);
    setDirty(true);
  };
  return (
    <form action={async (f) => { await action(f); setDirty(false); }} className="space-y-5">
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="toolId" value={toolId} />
      <input type="hidden" name="data" value={JSON.stringify(data)} />
      <div className="space-y-1">
        <label htmlFor="title" className={labelClass}>Título</label>
        <input id="title" name="title" defaultValue={title} required maxLength={200} onChange={() => setDirty(true)} className={inputClass} />
      </div>

      {kind === "swot" && <SwotEditor data={data as SwotData} set={set} />}
      {kind === "gut" && <GutEditor data={data as GutData} set={set} />}
      {kind === "cinco_porques" && <WhyEditor data={data as WhyData} set={set} />}
      {kind === "ishikawa" && <IshikawaEditor data={data as IshikawaData} set={set} />}
      {kind === "pareto" && <ParetoEditor data={data as ParetoData} set={set} />}
      {kind === "bsc" && <BscEditor data={data as BscData} set={set} />}
      {kind === "okr" && <OkrEditor data={data as OkrData} set={set} />}
      {isBoardKind(kind) && <BoardEditor kind={kind} data={data as BoardData} set={set} />}

      {(kind === "gut" || kind === "pareto" || kind === "okr") && (
        <section className="space-y-2">
          <h2 className="font-semibold text-plum">{kind === "gut" ? "Ranking" : kind === "okr" ? "Progresso" : "Gráfico"}</h2>
          <ToolView kind={kind} data={data} />
        </section>
      )}

      <div className="space-y-1">
        <label htmlFor="notes" className={labelClass}>Conclusões e observações</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={notes} onChange={() => setDirty(true)} className={inputClass} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="shared" defaultChecked={shared} onChange={() => setDirty(true)} className="size-5" />
        Compartilhar com o cliente (ele vê, mas não edita)
      </label>
      <div className="sticky bottom-3 space-y-2">
        <Feedback state={state} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
          {dirty && <span className="rounded-full bg-warn-bg px-3 py-1 text-sm font-semibold text-warn">Alterações não salvas</span>}
        </div>
      </div>
    </form>
  );
}

export function NewToolForm({ area, projectId }: { area: string; projectId: string }) {
  const [state, action] = useActionState(createTool, undefined);
  const [kind, setKind] = useState<ToolKind>("swot");
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1">
        <label htmlFor="kind" className={labelClass}>Ferramenta</label>
        <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as ToolKind)} className={inputClass}>
          {TOOL_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.kinds.map((k) => <option key={k} value={k}>{TOOLS[k].label}</option>)}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-muted">{TOOLS[kind].summary}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="new-title" className={labelClass}>Título</label>
        <input id="new-title" name="title" maxLength={200} placeholder={`Ex.: ${TOOLS[kind].label} — novembro`} className={inputClass} />
      </div>
      <SubmitButton pendingText="Criando…">Criar</SubmitButton>
    </form>
  );
}

export function GenerateActionButton({ area, projectId, toolId, itemKey }: { area: string; projectId: string; toolId: string; itemKey: string }) {
  const [state, action] = useActionState(toolToAction, undefined);
  if (state?.ok) return <span className="text-xs font-semibold text-ok">{state.ok}</span>;
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="toolId" value={toolId} />
      <input type="hidden" name="key" value={itemKey} />
      {state?.error && <span className="mr-2 text-xs text-bad">{state.error}</span>}
      <button type="submit" className={small}>Gerar ação</button>
    </form>
  );
}

export function DeleteToolForm({ area, projectId, toolId }: { area: string; projectId: string; toolId: string }) {
  const [state, action] = useActionState(deleteTool, undefined);
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-bad">Excluir esta ferramenta…</summary>
      <form action={action} className="mt-2 space-y-3">
        <Feedback state={state} />
        <input type="hidden" name="area" value={area} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="toolId" value={toolId} />
        <p className="text-muted">O conteúdo da ferramenta é apagado. As ações já geradas continuam no plano.</p>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-bad px-4 font-semibold text-white hover:opacity-90">Sim, excluir</button>
      </form>
    </details>
  );
}
