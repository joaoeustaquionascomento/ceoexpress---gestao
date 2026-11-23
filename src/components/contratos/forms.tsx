"use client";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelContract,
  deleteContract,
  deleteTemplate,
  finalizeSigned,
  generatePdf,
  linkCompany,
  markSent,
  saveContract,
  saveSettings,
  saveTemplate,
  setClientVisible,
  type FormResult,
} from "@/app/contratos/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, inputClass, labelClass, primaryButton } from "@/components/ui";
import { calcularParcelas, parcelasParaTexto, PLACEHOLDERS, type ContractData, type ProviderSettings } from "@/lib/contratos/dados";
import { lerReais } from "@/lib/contratos/extenso";
import { createClient } from "@/lib/supabase/client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 py-2 font-semibold text-mauve hover:bg-tint disabled:opacity-60";
const dangerButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-bad px-4 py-2 font-semibold text-bad hover:bg-bad-bg disabled:opacity-60";

function Feedback({ state }: { state: FormResult }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <Alert tone={state.error ? "bad" : "ok"}>
      {state.error ?? state.ok}
      {state.pendencias && state.pendencias.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {state.pendencias.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </Alert>
  );
}

function Field({ label, name, hint, children, className = "" }: { label: string; name: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
export function SettingsForm({ defaults }: { defaults: ProviderSettings }) {
  const [state, action] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da contratada" name="provider_name" hint="Aparece no quadro de assinaturas.">
          <input id="provider_name" name="provider_name" required maxLength={200} defaultValue={defaults.provider_name} className={inputClass} />
        </Field>
        <Field label="CNPJ ou CPF da contratada" name="provider_document" hint='Como deve aparecer abaixo da assinatura, ex.: "CNPJ nº 00.000.000/0001-00".'>
          <input id="provider_document" name="provider_document" maxLength={40} defaultValue={defaults.provider_document} className={inputClass} />
        </Field>
      </div>
      <Field
        label="Qualificação completa da contratada"
        name="provider_qualification"
        hint="O parágrafo que abre o contrato. Use **asteriscos duplos** para negrito."
      >
        <textarea
          id="provider_qualification"
          name="provider_qualification"
          rows={4}
          required
          maxLength={2000}
          defaultValue={defaults.provider_qualification}
          placeholder="**Nome da Empresa Ltda.**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede na Rua Exemplo, nº 100, bairro Centro, Cidade/UF, CEP 00000-000, neste ato representada conforme seus atos constitutivos"
          className={inputClass}
        />
      </Field>
      <Field label="Forma de pagamento padrão" name="payment_instructions" hint="Vem preenchida em todo contrato novo; dá para mudar em cada um.">
        <input id="payment_instructions" name="payment_instructions" maxLength={600} defaultValue={defaults.payment_instructions} placeholder="PIX, chave CNPJ nº 00.000.000/0001-00" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cidade padrão da assinatura" name="default_city">
          <input id="default_city" name="default_city" maxLength={120} defaultValue={defaults.default_city} placeholder="Cidade/UF" className={inputClass} />
        </Field>
        <Field label="Foro padrão" name="default_forum">
          <input id="default_forum" name="default_forum" maxLength={120} defaultValue={defaults.default_forum} placeholder="Cidade/UF" className={inputClass} />
        </Field>
      </div>
      <SubmitButton pendingText="Salvando…">Salvar configurações</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------
export function TemplateForm({ templateId, defaults }: { templateId?: string; defaults: { title?: string; description?: string; body?: string; active?: boolean } }) {
  const [state, action] = useActionState(saveTemplate, undefined);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const insert = (key: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const tag = `{{${key}}}`;
    const start = el.selectionStart ?? el.value.length;
    el.setRangeText(tag, start, el.selectionEnd ?? start, "end");
    el.focus();
  };
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {templateId && <input type="hidden" name="templateId" value={templateId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do modelo" name="title">
          <input id="title" name="title" required maxLength={200} defaultValue={defaults.title} className={inputClass} />
        </Field>
        <Field label="Para que serve" name="description">
          <input id="description" name="description" maxLength={1000} defaultValue={defaults.description} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Field label="Texto do contrato" name="body" hint="Clique num campo ao lado para inserir onde está o cursor.">
          <textarea id="body" ref={bodyRef} name="body" required rows={28} defaultValue={defaults.body} className={`${inputClass} font-mono text-sm`} />
        </Field>
        <aside className="space-y-3 text-sm">
          <div className="rounded-lg bg-canvas p-3">
            <p className="font-semibold text-plum">Como escrever</p>
            <ul className="mt-1 space-y-1 text-muted">
              <li><code># Título</code> título centralizado</li>
              <li><code>## Cláusula</code> título de cláusula</li>
              <li><code>- item</code> item de lista</li>
              <li><code>&gt; texto</code> linha centralizada</li>
              <li><code>---</code> nova página</li>
              <li><code>**texto**</code> negrito</li>
              <li>Linha em branco separa parágrafos.</li>
            </ul>
          </div>
          <div className="rounded-lg bg-canvas p-3">
            <p className="font-semibold text-plum">Campos</p>
            <ul className="mt-1 max-h-96 space-y-1 overflow-y-auto">
              {PLACEHOLDERS.map((p) => (
                <li key={p.key}>
                  <button type="button" onClick={() => insert(p.key)} className="text-left font-mono text-xs font-semibold text-mauve hover:underline">
                    {`{{${p.key}}}`}
                  </button>
                  <span className="block text-xs text-muted">{p.help}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={defaults.active ?? true} className="h-5 w-5 accent-[var(--plum)]" />
        Disponível para novos contratos
      </label>
      <SubmitButton pendingText="Salvando…">Salvar modelo</SubmitButton>
    </form>
  );
}

export function DeleteTemplateForm({ templateId }: { templateId: string }) {
  const [state, action] = useActionState(deleteTemplate, undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirmar("Excluir este modelo? Contratos já criados continuam guardados.")) e.preventDefault(); }} className="space-y-2">
      <Feedback state={state} />
      <input type="hidden" name="templateId" value={templateId} />
      <button className={dangerButton}>Excluir modelo</button>
    </form>
  );
}

function confirmar(msg: string) {
  return typeof window === "undefined" ? true : window.confirm(msg);
}

// ---------------------------------------------------------------------------
// Contrato: formulário de dados
// ---------------------------------------------------------------------------
export type CompanyOption = { id: string; legal_name: string; trade_name: string; cnpj: string | null };
export type TemplateOption = { id: string; title: string };

export function ContractForm({
  contractId,
  data,
  templateId,
  companyId,
  templates,
  companies,
  wasGenerated,
}: {
  contractId?: string;
  data: ContractData;
  templateId?: string | null;
  companyId?: string | null;
  templates: TemplateOption[];
  companies: CompanyOption[];
  wasGenerated?: boolean;
}) {
  const [state, action] = useActionState(saveContract, undefined);
  const [tipo, setTipo] = useState<"pf" | "pj">(data.tipo);
  const formRef = useRef<HTMLFormElement>(null);
  const [calc, setCalc] = useState({ n: "1", primeiro: "" });
  const [calcMsg, setCalcMsg] = useState<string | null>(null);

  const set = (name: string, value: string) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) el.value = value;
  };

  function onCompany(id: string) {
    const c = companies.find((x) => x.id === id);
    if (!c) return;
    const razao = (formRef.current?.elements.namedItem("pj_razao") as HTMLInputElement | null)?.value;
    if (tipo === "pj" && !razao) {
      set("pj_razao", c.legal_name);
      if (c.cnpj) set("pj_cnpj", c.cnpj);
    }
  }

  function calcular() {
    const totalTxt = (formRef.current?.elements.namedItem("valor_total") as HTMLInputElement | null)?.value ?? "";
    const total = lerReais(totalTxt);
    if (total === null || total <= 0) return setCalcMsg("Preencha o valor total primeiro.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(calc.primeiro)) return setCalcMsg("Escolha a data do 1º vencimento.");
    const n = Number(calc.n);
    if (!Number.isInteger(n) || n < 1 || n > 120) return setCalcMsg("Número de parcelas entre 1 e 120.");
    set("parcelas", parcelasParaTexto(calcularParcelas(total, n, calc.primeiro)));
    setCalcMsg("Parcelas calculadas. Você pode ajustar datas e valores à mão.");
  }

  const v = (k: keyof ContractData) => String(data[k] ?? "");

  return (
    <form ref={formRef} action={action} className="space-y-8">
      <Feedback state={state} />
      {contractId && <input type="hidden" name="contractId" value={contractId} />}
      {wasGenerated && (
        <Alert tone="warn">Ao salvar, o PDF já gerado deixa de valer e o contrato volta a rascunho. Depois é só gerar o PDF de novo.</Alert>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-plum">1. Modelo</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modelo de contrato" name="template_id">
            <select id="template_id" name="template_id" required defaultValue={templateId ?? templates[0]?.id ?? ""} className={inputClass}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="Empresa cliente no app (opcional)" name="company_id" hint="Liga o contrato à empresa, para o cliente poder vê-lo depois de assinado.">
            <select id="company_id" name="company_id" defaultValue={companyId ?? ""} onChange={(e) => onCompany(e.target.value)} className={inputClass}>
              <option value="">Nenhuma</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-plum">2. Contratante</legend>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Tipo de contratante">
          {([["pj", "Empresa (pessoa jurídica)"], ["pf", "Pessoa física"]] as const).map(([k, label]) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${tipo === k ? "border-plum bg-tint text-plum" : "border-line text-muted"}`}>
              <input type="radio" name="tipo" value={k} checked={tipo === k} onChange={() => setTipo(k)} className="h-4 w-4 accent-[var(--plum)]" />
              {label}
            </label>
          ))}
        </div>
        <div className={tipo === "pj" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Field label="Razão social" name="pj_razao"><input id="pj_razao" name="pj_razao" maxLength={200} defaultValue={v("pj_razao")} className={inputClass} /></Field>
          <Field label="CNPJ" name="pj_cnpj"><input id="pj_cnpj" name="pj_cnpj" maxLength={25} defaultValue={v("pj_cnpj")} placeholder="00.000.000/0001-00" className={inputClass} /></Field>
          <Field label="Representante legal" name="rep_nome"><input id="rep_nome" name="rep_nome" maxLength={200} defaultValue={v("rep_nome")} className={inputClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cargo" name="rep_cargo"><input id="rep_cargo" name="rep_cargo" maxLength={100} defaultValue={v("rep_cargo")} placeholder="sócio-administrador" className={inputClass} /></Field>
            <Field label="CPF do representante" name="rep_cpf"><input id="rep_cpf" name="rep_cpf" maxLength={20} defaultValue={v("rep_cpf")} className={inputClass} /></Field>
          </div>
        </div>
        <div className={tipo === "pf" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Field label="Nome completo" name="pf_nome"><input id="pf_nome" name="pf_nome" maxLength={200} defaultValue={v("pf_nome")} className={inputClass} /></Field>
          <Field label="CPF" name="pf_cpf"><input id="pf_cpf" name="pf_cpf" maxLength={20} defaultValue={v("pf_cpf")} placeholder="000.000.000-00" className={inputClass} /></Field>
          <Field label="Nacionalidade, estado civil e profissão (opcional)" name="pf_complemento" className="sm:col-span-2">
            <input id="pf_complemento" name="pf_complemento" maxLength={300} defaultValue={v("pf_complemento")} placeholder="brasileiro, casado, administrador" className={inputClass} />
          </Field>
        </div>
        <Field label="Endereço completo" name="endereco" hint="Rua, número, complemento, bairro, cidade/UF e CEP.">
          <input id="endereco" name="endereco" maxLength={400} defaultValue={v("endereco")} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" name="email"><input id="email" name="email" type="email" maxLength={200} defaultValue={v("email")} className={inputClass} /></Field>
          <Field label="Telefone (opcional)" name="telefone"><input id="telefone" name="telefone" maxLength={40} defaultValue={v("telefone")} className={inputClass} /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-plum">3. Escopo do trabalho</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do serviço" name="servico" hint="Ex.: Consultoria Estratégica, Mentoria Executiva.">
            <input id="servico" name="servico" maxLength={200} defaultValue={v("servico")} className={inputClass} />
          </Field>
          <Field label="Duração prevista" name="duracao" hint='Ex.: "10 (dez) semanas" ou "6 (seis) meses".'>
            <input id="duracao" name="duracao" maxLength={200} defaultValue={v("duracao")} className={inputClass} />
          </Field>
        </div>
        <Field label="Considerandos (opcional)" name="preambulo" hint='Parágrafos que explicam o contexto, cada um começando com "Considerando que…". Linha em branco separa parágrafos.'>
          <textarea id="preambulo" name="preambulo" rows={4} defaultValue={v("preambulo")} className={inputClass} />
        </Field>
        <Field label="Objeto" name="objeto" hint="Uma ou duas frases sobre o que será prestado.">
          <textarea id="objeto" name="objeto" rows={3} defaultValue={v("objeto")} placeholder="O objeto do presente Contrato é a prestação de serviços de …" className={inputClass} />
        </Field>
        <Field label="Escopo detalhado (Anexo I)" name="escopo" hint='Fases, atividades e entregáveis. Use "## Fase 1" para títulos e "- " no início da linha para itens.'>
          <textarea id="escopo" name="escopo" rows={10} defaultValue={v("escopo")} className={`${inputClass} text-sm`} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-plum">4. Valores e pagamento</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Valor total (R$)" name="valor_total"><input id="valor_total" name="valor_total" inputMode="decimal" maxLength={30} defaultValue={v("valor_total")} placeholder="4.990,00" className={inputClass} /></Field>
          <Field label="Nº de parcelas" name="calc_n"><input id="calc_n" type="number" min={1} max={120} value={calc.n} onChange={(e) => setCalc({ ...calc, n: e.target.value })} className={inputClass} /></Field>
          <Field label="1º vencimento" name="calc_primeiro"><input id="calc_primeiro" type="date" value={calc.primeiro} onChange={(e) => setCalc({ ...calc, primeiro: e.target.value })} className={inputClass} /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={calcular} className={secondaryButton}>Calcular parcelas mensais</button>
          {calcMsg && <span className="text-sm text-muted" role="status">{calcMsg}</span>}
        </div>
        <Field label="Parcelas" name="parcelas" hint='Uma por linha: data e valor, ex.: "15/06/2026 1.000,00". A soma precisa bater com o total.'>
          <textarea id="parcelas" name="parcelas" rows={5} defaultValue={v("parcelas")} className={`${inputClass} font-mono text-sm`} />
        </Field>
        <Field label="Forma de pagamento" name="forma_pagamento">
          <input id="forma_pagamento" name="forma_pagamento" maxLength={600} defaultValue={v("forma_pagamento")} className={inputClass} />
        </Field>
        <details className="rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-semibold text-mauve">Multas, juros, prazos e sigilo (valores padrão)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Multa por atraso (%)" name="multa_atraso"><input id="multa_atraso" name="multa_atraso" type="number" step="0.1" min={0} max={100} defaultValue={v("multa_atraso")} className={inputClass} /></Field>
            <Field label="Juros ao mês (%)" name="juros_mes"><input id="juros_mes" name="juros_mes" type="number" step="0.1" min={0} max={100} defaultValue={v("juros_mes")} className={inputClass} /></Field>
            <Field label="Índice de correção" name="indice_correcao"><input id="indice_correcao" name="indice_correcao" maxLength={60} defaultValue={v("indice_correcao")} className={inputClass} /></Field>
            <Field label="Multa por descumprimento (%)" name="multa_rescisoria"><input id="multa_rescisoria" name="multa_rescisoria" type="number" step="0.1" min={0} max={100} defaultValue={v("multa_rescisoria")} className={inputClass} /></Field>
            <Field label="Prazo para corrigir (dias)" name="prazo_cura"><input id="prazo_cura" name="prazo_cura" type="number" min={0} defaultValue={v("prazo_cura")} className={inputClass} /></Field>
            <Field label="Aviso prévio (dias)" name="aviso_previo"><input id="aviso_previo" name="aviso_previo" type="number" min={0} defaultValue={v("aviso_previo")} className={inputClass} /></Field>
            <Field label="Sigilo após o fim (anos)" name="sigilo_anos"><input id="sigilo_anos" name="sigilo_anos" type="number" min={0} max={50} defaultValue={v("sigilo_anos")} className={inputClass} /></Field>
            <Field label="Data de início (opcional)" name="data_inicio"><input id="data_inicio" name="data_inicio" type="date" defaultValue={v("data_inicio")} className={inputClass} /></Field>
          </div>
        </details>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-plum">5. Assinatura</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cidade" name="cidade"><input id="cidade" name="cidade" maxLength={120} defaultValue={v("cidade")} placeholder="Cidade/UF" className={inputClass} /></Field>
          <Field label="Data" name="data_assinatura"><input id="data_assinatura" name="data_assinatura" type="date" defaultValue={v("data_assinatura")} className={inputClass} /></Field>
          <Field label="Foro" name="foro"><input id="foro" name="foro" maxLength={120} defaultValue={v("foro")} placeholder="Cidade/UF" className={inputClass} /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="testemunhas" defaultChecked={data.testemunhas} className="h-5 w-5 accent-[var(--plum)]" />
          Incluir espaço para 2 testemunhas
        </label>
      </fieldset>

      <SubmitButton pendingText="Salvando…">{contractId ? "Salvar alterações" : "Salvar e ver a prévia"}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Contrato: botões de andamento
// ---------------------------------------------------------------------------
function ContractButton({
  contractId, act, label, pendingText, style = "primary", confirmText, extra,
}: {
  contractId: string;
  act: (s: FormResult, f: FormData) => Promise<FormResult>;
  label: string;
  pendingText?: string;
  style?: "primary" | "secondary" | "danger";
  confirmText?: string;
  extra?: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(act, undefined);
  const cls = style === "primary" ? primaryButton : style === "danger" ? dangerButton : secondaryButton;
  return (
    <form action={action} onSubmit={(e) => { if (confirmText && !confirmar(confirmText)) e.preventDefault(); }} className="space-y-2">
      <Feedback state={state} />
      <input type="hidden" name="contractId" value={contractId} />
      {extra && Object.entries(extra).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
      <button disabled={pending} aria-busy={pending} className={`${cls} w-full sm:w-auto`}>{pending ? (pendingText ?? "Aguarde…") : label}</button>
    </form>
  );
}

export function GenerateButton({ contractId, again }: { contractId: string; again?: boolean }) {
  return <ContractButton contractId={contractId} act={generatePdf} label={again ? "Gerar o PDF de novo" : "Gerar PDF"} pendingText="Gerando o PDF…" style={again ? "secondary" : "primary"} />;
}
export function SentButton({ contractId }: { contractId: string }) {
  return <ContractButton contractId={contractId} act={markSent} label="Marcar como enviado ao cliente" style="secondary" />;
}
export function CancelButton({ contractId }: { contractId: string }) {
  return <ContractButton contractId={contractId} act={cancelContract} label="Cancelar contrato" style="danger" confirmText="Cancelar este contrato? Ele fica guardado, mas não poderá mais ser assinado." />;
}
export function DeleteContractButton({ contractId }: { contractId: string }) {
  return <ContractButton contractId={contractId} act={deleteContract} label="Excluir contrato" style="danger" confirmText="Excluir este contrato de vez?" />;
}
export function VisibleButton({ contractId, visible }: { contractId: string; visible: boolean }) {
  return (
    <ContractButton
      contractId={contractId}
      act={setClientVisible}
      label={visible ? "Ocultar do cliente" : "Liberar para o cliente ver e baixar"}
      style={visible ? "secondary" : "primary"}
      extra={{ visible: visible ? "0" : "1" }}
    />
  );
}

export function LinkCompanyForm({ contractId, companyId, companies }: { contractId: string; companyId: string | null; companies: CompanyOption[] }) {
  const [state, action] = useActionState(linkCompany, undefined);
  return (
    <form action={action} className="space-y-2">
      <Feedback state={state} />
      <input type="hidden" name="contractId" value={contractId} />
      <label htmlFor="link_company" className={labelClass}>Empresa cliente no app</label>
      <div className="flex flex-wrap gap-2">
        <select id="link_company" name="company_id" defaultValue={companyId ?? ""} className={`${inputClass} sm:max-w-xs`}>
          <option value="">Nenhuma</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name}</option>)}
        </select>
        <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Subir o PDF assinado (vai direto do navegador para o armazenamento privado)
// ---------------------------------------------------------------------------
async function sha256Hex(file: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function SignedUpload({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    setError(null);
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Selecione o PDF assinado.");
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) return setError("Envie o arquivo em PDF.");
    if (file.size > MAX_UPLOAD_BYTES) return setError("O arquivo passa de 25 MB.");
    try {
      setStep("Calculando a impressão digital do arquivo…");
      const hash = await sha256Hex(file);
      setStep("Enviando…");
      const path = `${contractId}/assinado-${Date.now()}.pdf`;
      const { error: upErr } = await createClient().storage.from("contratos").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) return setError("O envio foi interrompido. Confira sua conexão e tente de novo.");
      setStep("Confirmando…");
      const res = await finalizeSigned({ contractId, path, fileName: file.name, sha256: hash });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    } catch {
      setError("O envio foi interrompido. Confira sua conexão e tente de novo.");
    } finally {
      setStep(null);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }} className="space-y-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <label htmlFor="signed-file" className={labelClass}>PDF assinado</label>
      <input
        id="signed-file"
        name="file"
        type="file"
        accept=".pdf,application/pdf"
        required
        className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-tint file:px-4 file:font-semibold file:text-plum"
      />
      <button type="submit" disabled={step !== null} aria-busy={step !== null} className={`${primaryButton} w-full sm:w-auto`}>
        {step ?? "Subir PDF assinado"}
      </button>
    </form>
  );
}
