"use client";
import { useActionState, useState } from "react";
import { updateCompany } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { formatCnpj } from "@/lib/cnpj";
import type { CompanyRecord } from "@/lib/contratos/cliente";

function F({ label, name, value, hint, className = "", ...rest }: { label: string; name: string; value?: string | null; hint?: string; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value">) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <input id={name} name={name} defaultValue={value ?? ""} className={inputClass} {...rest} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Edição do cadastro do cliente, com os dados que os contratos usam. */
export function CompanyEditForm({ company: c }: { company: CompanyRecord & { segment: string | null } }) {
  const [state, action] = useActionState(updateCompany, undefined);
  const [kind, setKind] = useState<"pj" | "pf">(c.person_kind === "pf" ? "pf" : "pj");
  const pf = kind === "pf";
  return (
    <form action={action} className="space-y-6">
      {state?.error && <Alert tone="bad">{state.error}</Alert>}
      {state?.ok && <Alert tone="ok">{state.ok}</Alert>}
      <input type="hidden" name="companyId" value={c.id} />
      <div className="space-y-1">
        <label htmlFor="person_kind" className={labelClass}>Tipo</label>
        <select id="person_kind" name="person_kind" value={kind} onChange={(e) => setKind(e.target.value as "pj" | "pf")} className={inputClass}>
          <option value="pj">Empresa (pessoa jurídica)</option>
          <option value="pf">Pessoa física</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label={pf ? "Nome completo" : "Razão social"} name="legal_name" value={c.legal_name} required maxLength={200} />
        <F label={pf ? "Como chamar no app" : "Nome fantasia"} name="trade_name" value={c.trade_name} required maxLength={120} />
        {pf ? (
          <>
            <F label="CPF" name="cpf" value={c.cpf} maxLength={20} placeholder="000.000.000-00" />
            <F label="Nacionalidade, estado civil e profissão" name="qualification_extra" value={c.qualification_extra} maxLength={300} placeholder="brasileiro, casado, administrador" />
          </>
        ) : (
          <>
            <F label="CNPJ" name="cnpj" value={formatCnpj(c.cnpj)} maxLength={30} inputMode="numeric" />
            <F label="Segmento" name="segment" value={c.segment} maxLength={120} />
          </>
        )}
      </div>
      {!pf && (
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 font-semibold text-plum">Representante legal</legend>
          <F label="Nome" name="rep_name" value={c.rep_name} maxLength={200} />
          <F label="Cargo" name="rep_role" value={c.rep_role} maxLength={100} placeholder="sócio-administrador" />
          <F label="CPF" name="rep_cpf" value={c.rep_cpf} maxLength={20} />
        </fieldset>
      )}
      {pf && <input type="hidden" name="segment" value={c.segment ?? ""} />}
      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold text-plum">Endereço e contato</legend>
        <F label="Endereço completo" name="address" value={c.address} maxLength={400} hint="Rua, número, complemento, bairro, cidade/UF e CEP." />
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="E-mail" name="email" type="email" value={c.email} maxLength={200} />
          <F label="Telefone" name="phone" value={c.phone} maxLength={40} />
        </div>
      </fieldset>
      <SubmitButton pendingText="Salvando…">Salvar cadastro</SubmitButton>
    </form>
  );
}
