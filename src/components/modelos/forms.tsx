"use client";
import { useActionState, useState } from "react";
import {
  applyTemplates,
  deleteAction,
  deleteRequest,
  deleteTemplate,
  importTemplates,
  saveActionTemplate,
  saveRequest,
  saveRequestTemplate,
  type FormResult,
} from "@/app/modelos/actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DEFAULT_FORMATS, FOLDERS } from "@/lib/checklist";

function Feedback({ state }: { state: FormResult }) {
  return (
    <>
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
    </>
  );
}

function Field({ label, name, hint, children }: { label: string; name: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export type RequestDefaults = Partial<Record<
  "code" | "title" | "category" | "stage" | "description" | "purpose" | "minimum_content" | "examples" | "instructions" | "checklist" | "accepted_formats" | "owner_label" | "due_on",
  string
>> & { internal?: boolean; active?: boolean };

/** Formulário de pedido (no projeto) ou de modelo de pedido (na biblioteca). */
export function RequestForm({
  mode, area, projectId, requestId, templateId, defaults, categories,
}: {
  mode: "projeto" | "modelo";
  area?: string;
  projectId?: string;
  requestId?: string;
  templateId?: string;
  defaults: RequestDefaults;
  categories: string[];
}) {
  const [state, action] = useActionState(mode === "modelo" ? saveRequestTemplate : saveRequest, undefined);
  const v = (k: keyof RequestDefaults) => (typeof defaults[k] === "string" ? (defaults[k] as string) : "");
  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      {area && <input type="hidden" name="area" value={area} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      {templateId && <input type="hidden" name="templateId" value={templateId} />}

      <fieldset className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <legend className="mb-2 font-semibold text-plum">Identificação</legend>
        <Field label="Código" name="code" hint="Ex.: D17">
          <input id="code" name="code" required maxLength={20} defaultValue={v("code")} className={inputClass} />
        </Field>
        <Field label="Título do pedido" name="title">
          <input id="title" name="title" required maxLength={300} defaultValue={v("title")} className={inputClass} />
        </Field>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria" name="category" hint="Agrupa os pedidos na página do projeto.">
          <input id="category" name="category" list="categorias" defaultValue={v("category")} className={inputClass} />
          <datalist id="categorias">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Pasta dos arquivos" name="stage">
          <select id="stage" name="stage" defaultValue={v("stage") || "01_DOCUMENTOS_INSTITUCIONAIS"} className={inputClass}>
            {Object.entries(FOLDERS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </Field>
        {mode === "projeto" && (
          <>
            <Field label="Responsável no cliente" name="owner_label" hint="Nome por extenso, se ainda não tiver usuário.">
              <input id="owner_label" name="owner_label" maxLength={200} defaultValue={v("owner_label")} className={inputClass} />
            </Field>
            <Field label="Prazo" name="due_on">
              <input id="due_on" name="due_on" type="date" defaultValue={v("due_on")} className={inputClass} />
            </Field>
          </>
        )}
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold text-plum">Orientações ao cliente</legend>
        <Field label="O que enviar" name="description">
          <textarea id="description" name="description" rows={3} defaultValue={v("description")} className={inputClass} />
        </Field>
        <Field label="Para que serve" name="purpose">
          <textarea id="purpose" name="purpose" rows={2} defaultValue={v("purpose")} className={inputClass} />
        </Field>
        <Field label="Conteúdo mínimo para aceite" name="minimum_content">
          <textarea id="minimum_content" name="minimum_content" rows={2} defaultValue={v("minimum_content")} className={inputClass} />
        </Field>
        <Field label="Exemplos" name="examples">
          <textarea id="examples" name="examples" rows={2} defaultValue={v("examples")} className={inputClass} />
        </Field>
        <Field label="Subitens" name="checklist" hint='Um por linha. Para dar uma orientação ao subitem, escreva depois de "::". Ex.: Extratos recentes :: dos últimos 3 meses'>
          <textarea id="checklist" name="checklist" rows={5} defaultValue={v("checklist")} className={inputClass} />
        </Field>
        <Field label="Passo a passo" name="instructions">
          <textarea id="instructions" name="instructions" rows={3} defaultValue={v("instructions")} className={inputClass} />
        </Field>
        <Field label="Formatos aceitos" name="accepted_formats" hint="Separados por vírgula.">
          <input id="accepted_formats" name="accepted_formats" defaultValue={v("accepted_formats") || DEFAULT_FORMATS} className={inputClass} />
        </Field>
      </fieldset>

      {mode === "projeto" ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="internal" defaultChecked={defaults.internal} className="size-5" />
          Interno (o cliente não vê este pedido)
        </label>
      ) : (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="active" value="off" defaultChecked={defaults.active === false} className="size-5" />
          Arquivado (não aparece na hora de montar projetos)
        </label>
      )}

      <SubmitButton pendingText="Salvando…">{requestId || templateId ? "Salvar alterações" : mode === "modelo" ? "Criar modelo" : "Criar pedido"}</SubmitButton>
    </form>
  );
}

export type ActionTemplateDefaults = Partial<Record<
  "code" | "kind" | "title" | "rationale" | "area" | "how" | "priority" | "decision_inputs" | "resources" | "expected_evidence" | "completion_criteria" | "basis",
  string
>> & { active?: boolean };

export function ActionTemplateForm({ templateId, defaults }: { templateId?: string; defaults: ActionTemplateDefaults }) {
  const [state, action] = useActionState(saveActionTemplate, undefined);
  const v = (k: keyof ActionTemplateDefaults) => (typeof defaults[k] === "string" ? (defaults[k] as string) : "");
  const text = (name: keyof ActionTemplateDefaults, label: string, rows = 2) => (
    <Field label={label} name={name}>
      <textarea id={name} name={name} rows={rows} defaultValue={v(name)} className={inputClass} />
    </Field>
  );
  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      {templateId && <input type="hidden" name="templateId" value={templateId} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Código" name="code" hint="Ex.: A40">
          <input id="code" name="code" required maxLength={20} defaultValue={v("code")} className={inputClass} />
        </Field>
        <Field label="Tipo" name="kind">
          <select id="kind" name="kind" defaultValue={v("kind") || "acao_5w2h"} className={inputClass}>
            <option value="acao_5w2h">Ação 5W2H</option>
            <option value="tarefa">Tarefa</option>
            <option value="pendencia">Pendência</option>
          </select>
        </Field>
        <Field label="Prioridade" name="priority">
          <select id="priority" name="priority" defaultValue={v("priority") || "media"} className={inputClass}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </Field>
      </div>
      <Field label="O que precisa ser realizado?" name="title">
        <input id="title" name="title" required maxLength={300} defaultValue={v("title")} className={inputClass} />
      </Field>
      {text("rationale", "Por que precisa ser realizado?")}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Onde (área)" name="area">
          <input id="area" name="area" maxLength={300} defaultValue={v("area")} className={inputClass} />
        </Field>
        <Field label="Base ou referência" name="basis">
          <input id="basis" name="basis" maxLength={1000} defaultValue={v("basis")} className={inputClass} />
        </Field>
      </div>
      {text("how", "Como será feito?", 3)}
      {text("decision_inputs", "Quais informações são necessárias?")}
      {text("resources", "Quanto custa / recursos")}
      {text("expected_evidence", "Como será comprovado o resultado?")}
      {text("completion_criteria", "Critério de conclusão")}
      <p className="text-sm text-muted">Quem executa, quem decide e os prazos são definidos em cada projeto.</p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" value="off" defaultChecked={defaults.active === false} className="size-5" />
        Arquivado (não aparece na hora de montar projetos)
      </label>
      <SubmitButton pendingText="Salvando…">{templateId ? "Salvar alterações" : "Criar modelo"}</SubmitButton>
    </form>
  );
}

/** Exclusão em dois passos: abre a confirmação, depois exclui. */
export function DeleteForm({
  kind, hidden, label, warning,
}: {
  kind: "pedido" | "acao" | "modelo";
  hidden: Record<string, string>;
  label: string;
  warning: string;
}) {
  const fn = kind === "pedido" ? deleteRequest : kind === "acao" ? deleteAction : deleteTemplate;
  const [state, action] = useActionState(fn, undefined);
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm" open={Boolean(state?.error)}>
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-bad">{label}…</summary>
      <form action={action} className="mt-2 space-y-3">
        <Feedback state={state} />
        {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <p className="text-muted">{warning}</p>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-bad px-4 font-semibold text-white hover:opacity-90">
          Sim, excluir
        </button>
      </form>
    </details>
  );
}

type Tpl = { id: string; code: string; title: string; group: string; exists: boolean };

function Group({ name, label, items, checked, toggle, setMany }: {
  name: "req" | "act";
  label: string;
  items: Tpl[];
  checked: Set<string>;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
}) {
  const available = items.filter((i) => !i.exists);
  const groups = [...new Set(items.map((i) => i.group))];
  const count = available.filter((i) => checked.has(i.id)).length;
  return (
    <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <legend className="px-1 font-semibold text-plum">{label}</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{count} de {available.length} marcados</span>
        <button type="button" onClick={() => setMany(available.map((i) => i.id), true)} className="min-h-11 rounded-lg border border-line px-3 font-semibold text-mauve hover:bg-tint">Marcar todos</button>
        <button type="button" onClick={() => setMany(available.map((i) => i.id), false)} className="min-h-11 rounded-lg border border-line px-3 font-semibold text-mauve hover:bg-tint">Desmarcar</button>
      </div>
      {items.length === 0 && <p className="text-sm text-muted">A biblioteca ainda não tem modelos deste tipo.</p>}
      {groups.map((g) => (
        <div key={g}>
          {g && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{g}</p>}
          <ul className="space-y-1">
            {items.filter((i) => i.group === g).map((i) => (
              <li key={i.id}>
                <label className={`flex min-h-11 items-start gap-3 rounded-lg px-2 py-2 text-sm ${i.exists ? "text-muted" : "hover:bg-tint"}`}>
                  <input
                    type="checkbox"
                    name={name}
                    value={i.id}
                    disabled={i.exists}
                    checked={!i.exists && checked.has(i.id)}
                    onChange={() => toggle(i.id)}
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <span><span className="font-semibold">{i.code}</span> · {i.title}{i.exists && " (já está no projeto)"}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </fieldset>
  );
}

/** Escolha dos modelos de pedidos e ações para criar no projeto. */
export function TemplatePicker({
  area, projectId, requests, actions,
}: {
  area: string;
  projectId: string;
  requests: Tpl[];
  actions: Tpl[];
}) {
  const [state, action] = useActionState(applyTemplates, undefined);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setMany = (ids: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  return (
    <form action={async (f) => { await action(f); setChecked(new Set()); }} className="space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Group name="req" label="Pedidos de informação" items={requests} checked={checked} toggle={toggle} setMany={setMany} />
        <Group name="act" label="Ações do plano" items={actions} checked={checked} toggle={toggle} setMany={setMany} />
      </div>
      <p className="text-sm text-muted">
        Os itens são criados sem responsável e sem prazo. Depois, ajuste cada um no projeto (na lista do plano, use
        &quot;Alterar executor e prazo&quot;).
      </p>
      <div className="sticky bottom-3">
        <SubmitButton pendingText="Criando…">{`Criar ${checked.size} item(ns) no projeto`}</SubmitButton>
      </div>
    </form>
  );
}

export function ImportForm({ projects }: { projects: { id: string; label: string }[] }) {
  const [state, action] = useActionState(importTemplates, undefined);
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <Field label="Projeto de origem" name="projectId">
        <select id="projectId" name="projectId" required defaultValue="" className={inputClass}>
          <option value="" disabled>Selecione</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      <SubmitButton pendingText="Importando…">Copiar para a biblioteca</SubmitButton>
    </form>
  );
}
