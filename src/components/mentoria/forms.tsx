"use client";
import { useActionState, useState } from "react";
import {
  cancelApplication,
  createApplications,
  createExternal,
  deleteApplication,
  deleteLibraryItem,
  importScores,
  regenerateLink,
  saveLibraryItem,
  saveReview,
  type MentoriaState,
} from "@/app/mentoria/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, inputClass, labelClass } from "@/components/ui";

export type Member = { id: string; name: string; email: string };
export type InstrumentOption = { id: string; name: string; summary: string; minutes: number; count: number };
export type DimOption = { id: string; label: string };

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
      className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint"
    >
      {done ? "Copiado!" : label}
    </button>
  );
}

function Result({ state }: { state: MentoriaState }) {
  if (!state) return null;
  return (
    <div className="space-y-3">
      {state.error && <Alert tone="bad">{state.error}</Alert>}
      {state.ok && <Alert tone="ok">{state.ok}</Alert>}
      {state.links && state.links.length > 0 && (
        <ul className="space-y-2">
          {state.links.map((l) => (
            <li key={l.url} className="rounded-lg border border-line p-3">
              <p className="text-sm font-semibold text-plum">{l.name}</p>
              <p className="break-all text-xs text-muted">{l.url}</p>
              <div className="mt-2"><CopyButton text={l.url} label="Copiar link" /></div>
            </li>
          ))}
        </ul>
      )}
      {state.message && (
        <div className="rounded-lg bg-tint p-3">
          <p className="mb-2 text-sm font-semibold text-plum">Mensagem pronta para WhatsApp ou e-mail</p>
          <pre className="whitespace-pre-wrap text-xs">{state.message}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton text={state.message} label="Copiar mensagem" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(state.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint"
            >
              Abrir no WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberSelect({ members, name = "respondent_id", defaultValue = "" }: { members: Member[]; name?: string; defaultValue?: string }) {
  return (
    <select id={name} name={name} className={inputClass} defaultValue={defaultValue}>
      <option value="">Sem conta no app</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name} ({m.email})
        </option>
      ))}
    </select>
  );
}

export function CreateApplicationsForm({ projectId, instruments, members, defaultName }: { projectId: string; instruments: InstrumentOption[]; members: Member[]; defaultName: string }) {
  const [state, action] = useActionState(createApplications, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <fieldset className="space-y-2">
        <legend className={labelClass}>Avaliações</legend>
        {instruments.map((i) => (
          <label key={i.id} className="flex min-h-11 items-start gap-3 rounded-lg border border-line p-3 hover:border-mauve">
            <input type="checkbox" name="instrument" value={i.id} className="mt-1 h-5 w-5 accent-plum" />
            <span>
              <span className="font-semibold text-plum">{i.name}</span>
              <span className="block text-xs text-muted">{i.summary} {i.count} perguntas, cerca de {i.minutes} min.</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="respondent_name">Nome do mentorado</label>
        <input id="respondent_name" name="respondent_name" required defaultValue={defaultName} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="respondent_email">E-mail (opcional)</label>
        <input id="respondent_email" name="respondent_email" type="email" className={inputClass} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="send_email" className="h-5 w-5 accent-plum" /> Enviar os links por e-mail agora
        </label>
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="respondent_id">Conta do mentorado no app (opcional)</label>
        <MemberSelect members={members} />
        <p className="text-xs text-muted">Com a conta escolhida, você pode liberar o relatório para ele ver no app. Sem conta, envie o PDF.</p>
      </div>
      <SubmitButton>Gerar links</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function ReviewForm({
  projectId,
  appId,
  comment,
  released,
  respondentId,
  members,
  canRelease,
}: {
  projectId: string;
  appId: string;
  comment: string;
  released: boolean;
  respondentId: string;
  members: Member[];
  canRelease: boolean;
}) {
  const [state, action] = useActionState(saveReview, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="appId" value={appId} />
      <div className="space-y-1">
        <label className={labelClass} htmlFor="mentor_comment">Comentário do mentor</label>
        <textarea id="mentor_comment" name="mentor_comment" rows={6} defaultValue={comment} className={inputClass} placeholder="Sua leitura, o que conversar na próxima sessão, o que observar." />
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="respondent_id">Conta do mentorado no app</label>
        <MemberSelect members={members} defaultValue={respondentId} />
      </div>
      {canRelease && (
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="release" defaultChecked={released} className="mt-1 h-5 w-5 accent-plum" />
          <span>Liberar o relatório para o mentorado ver no app (só ele vê; o gestor da empresa não vê).</span>
        </label>
      )}
      <SubmitButton>Salvar</SubmitButton>
      <Result state={state} />
    </form>
  );
}

function SmallAction({
  action,
  projectId,
  appId,
  area,
  label,
  confirm,
  danger,
}: {
  action: (s: MentoriaState, f: FormData) => Promise<MentoriaState>;
  projectId: string;
  appId: string;
  area?: string;
  label: string;
  confirm?: string;
  danger?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="appId" value={appId} />
      {area && <input type="hidden" name="area" value={area} />}
      <button
        type="submit"
        className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold ${danger ? "border-bad text-bad hover:bg-bad-bg" : "border-line text-mauve hover:bg-tint"}`}
      >
        {label}
      </button>
      <Result state={state} />
    </form>
  );
}

export function LinkActions({ projectId, appId, area, open }: { projectId: string; appId: string; area: string; open: boolean }) {
  return (
    <div className="space-y-3">
      {open && <SmallAction action={regenerateLink} projectId={projectId} appId={appId} label="Gerar novo link" />}
      {open && <SmallAction action={cancelApplication} projectId={projectId} appId={appId} label="Cancelar avaliação" confirm="Cancelar esta avaliação? O link deixa de funcionar." />}
      <SmallAction action={deleteApplication} projectId={projectId} appId={appId} area={area} label="Excluir" danger confirm="Excluir esta avaliação e as respostas? Não dá para desfazer." />
    </div>
  );
}

export function ExternalForm({ projectId, members, defaultName }: { projectId: string; members: Member[]; defaultName: string }) {
  const [state, action] = useActionState(createExternal, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1">
        <label className={labelClass} htmlFor="ext_title">Nome do teste</label>
        <input id="ext_title" name="title" required placeholder="Ex.: teste oficial de um livro ou de outra plataforma" className={inputClass} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="ext_name">Mentorado</label>
          <input id="ext_name" name="respondent_name" required defaultValue={defaultName} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="ext_date">Data do teste</label>
          <input id="ext_date" name="applied_on" type="date" required className={inputClass} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_90px_90px]">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="ext_pr">Nota principal</label>
          <input id="ext_pr" name="principal_rotulo" placeholder="Ex.: Índice geral" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="ext_pv">Valor</label>
          <input id="ext_pv" name="principal_valor" inputMode="decimal" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="ext_pm">Máximo</label>
          <input id="ext_pm" name="principal_maximo" inputMode="decimal" defaultValue="100" className={inputClass} />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="ext_itens">Notas por item (uma por linha)</label>
        <textarea id="ext_itens" name="itens" rows={5} className={inputClass} placeholder={"nome; nota; máximo\nExemplo: Autocrítica; 7; 10"} />
        <p className="text-xs text-muted">Digite só os números do resultado. O app não copia textos do relatório original.</p>
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="ext_link">Link do teste ou do resultado (opcional)</label>
        <input id="ext_link" name="link" type="url" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="ext_resp">Conta do mentorado no app (opcional)</label>
        <MemberSelect members={members} />
      </div>
      <SubmitButton>Registrar teste</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function ImportForm({ projectId, instruments, dims, members, defaultName }: { projectId: string; instruments: InstrumentOption[]; dims: Record<string, DimOption[]>; members: Member[]; defaultName: string }) {
  const [state, action] = useActionState(importScores, undefined);
  const [inst, setInst] = useState(instruments[0]?.id ?? "");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1">
        <label className={labelClass} htmlFor="imp_inst">Avaliação equivalente</label>
        <select id="imp_inst" name="instrument" value={inst} onChange={(e) => setInst(e.target.value)} className={inputClass}>
          {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="imp_name">Mentorado</label>
          <input id="imp_name" name="respondent_name" required defaultValue={defaultName} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="imp_date">Data em que foi feito</label>
          <input id="imp_date" name="applied_on" type="date" required className={inputClass} />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="imp_title">Origem (opcional)</label>
        <input id="imp_title" name="title" placeholder="Ex.: ferramenta usada antes" className={inputClass} />
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className={`${labelClass} mb-1`}>Notas de 0 a 10 (deixe em branco o que não tiver)</legend>
        {(dims[inst] ?? []).map((d) => (
          <label key={`${inst}-${d.id}`} className="flex items-center justify-between gap-2 text-sm">
            <span>{d.label}</span>
            <input name={`dim_${d.id}`} inputMode="decimal" className={`${inputClass} !w-20`} />
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <label className={labelClass} htmlFor="imp_resp">Conta do mentorado no app (opcional)</label>
        <MemberSelect members={members} />
      </div>
      <SubmitButton>Registrar notas</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export type LibraryFormItem = { id: string; kind: "livro" | "filme"; title: string; author: string | null; year: number | null; tags: string[]; note: string | null; active: boolean };
export type TagGroup = { label: string; tags: { tag: string; label: string }[] };

/** Cadastro e edição de um livro ou filme da biblioteca (administrador). */
export function LibraryForm({ item, groups }: { item?: LibraryFormItem; groups: TagGroup[] }) {
  const [state, action] = useActionState(saveLibraryItem, undefined);
  const p = item?.id ?? "novo";
  return (
    <form action={action} className="space-y-3">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="space-y-1">
          <label className={labelClass} htmlFor={`${p}_kind`}>Tipo</label>
          <select id={`${p}_kind`} name="kind" defaultValue={item?.kind ?? "livro"} className={inputClass}>
            <option value="livro">Livro</option>
            <option value="filme">Filme</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor={`${p}_title`}>Título</label>
          <input id={`${p}_title`} name="title" required defaultValue={item?.title ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="space-y-1">
          <label className={labelClass} htmlFor={`${p}_author`}>Autor ou diretor</label>
          <input id={`${p}_author`} name="author" defaultValue={item?.author ?? ""} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor={`${p}_year`}>Ano</label>
          <input id={`${p}_year`} name="year" inputMode="numeric" defaultValue={item?.year ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass} htmlFor={`${p}_note`}>Por que indicar (opcional)</label>
        <textarea id={`${p}_note`} name="note" rows={2} defaultValue={item?.note ?? ""} className={inputClass} />
      </div>
      <fieldset className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-line p-3">
        <legend className={`${labelClass} px-1`}>Temas em que aparece como sugestão</legend>
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose">{g.label}</p>
            <div className="grid gap-1 sm:grid-cols-2">
              {g.tags.map((t) => (
                <label key={t.tag} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="tags" value={t.tag} defaultChecked={item?.tags.includes(t.tag)} className="h-4 w-4 accent-plum" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="hidden" name="active" value="off" />
        <input type="checkbox" name="active" value="on" defaultChecked={item?.active ?? true} className="h-4 w-4 accent-plum" />
        Ativo (aparece nas sugestões dos relatórios)
      </label>
      <SubmitButton>{item ? "Salvar alterações" : "Adicionar à biblioteca"}</SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function LibraryDelete({ id }: { id: string }) {
  const [state, action] = useActionState(deleteLibraryItem, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Excluir este item da biblioteca?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border border-bad px-3 text-sm font-semibold text-bad hover:bg-bad-bg">Excluir</button>
      <Result state={state} />
    </form>
  );
}
