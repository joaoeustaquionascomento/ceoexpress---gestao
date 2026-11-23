/**
 * Ponte entre o cadastro do cliente (tabela companies) e os campos do contrato:
 * puxa os dados para o formulário e devolve ao cadastro o que estava vazio.
 */
import { formatCnpj } from "@/lib/cnpj";
import type { ContractData } from "./dados";

export type CompanyRecord = {
  id: string;
  legal_name: string;
  trade_name: string;
  cnpj: string | null;
  person_kind: "pj" | "pf" | null;
  cpf: string | null;
  qualification_extra: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  rep_name: string | null;
  rep_role: string | null;
  rep_cpf: string | null;
};

export const COMPANY_FIELDS = "id, legal_name, trade_name, cnpj, person_kind, cpf, qualification_extra, address, email, phone, rep_name, rep_role, rep_cpf";

/** Campos do contrato que vêm do cadastro. */
export function dadosDoCliente(c: CompanyRecord): Partial<ContractData> {
  const pf = c.person_kind === "pf";
  return {
    tipo: pf ? "pf" : "pj",
    ...(pf
      ? { pf_nome: c.legal_name, pf_cpf: c.cpf ?? "", pf_complemento: c.qualification_extra ?? "" }
      : { pj_razao: c.legal_name, pj_cnpj: c.cnpj ? formatCnpj(c.cnpj) : "", rep_nome: c.rep_name ?? "", rep_cargo: c.rep_role ?? "", rep_cpf: c.rep_cpf ?? "" }),
    endereco: c.address ?? "",
    email: c.email ?? "",
    telefone: c.phone ?? "",
  };
}

/** O que o contrato pode completar no cadastro: só colunas vazias, nunca sobrescreve. */
export function completarCadastro(c: CompanyRecord, d: ContractData): Partial<CompanyRecord> {
  const patch: Partial<CompanyRecord> = {};
  const fill = <K extends keyof CompanyRecord>(k: K, v: string) => {
    if (v && !c[k]) (patch as Record<string, string>)[k] = v;
  };
  fill("address", d.endereco);
  fill("email", d.email);
  fill("phone", d.telefone);
  if (d.tipo === "pf" && c.person_kind === "pf") {
    fill("cpf", d.pf_cpf);
    fill("qualification_extra", d.pf_complemento);
  }
  if (d.tipo === "pj" && c.person_kind !== "pf") {
    fill("rep_name", d.rep_nome);
    fill("rep_role", d.rep_cargo);
    fill("rep_cpf", d.rep_cpf);
    const digits = d.pj_cnpj.replace(/\D/g, "");
    if (!c.cnpj && digits.length === 14) patch.cnpj = digits;
  }
  return patch;
}
