import { describe, expect, it } from "vitest";
import { completarCadastro, dadosDoCliente, type CompanyRecord } from "@/lib/contratos/cliente";
import { EMPTY_SETTINGS, defaultData } from "@/lib/contratos/dados";

const base: CompanyRecord = {
  id: "c1", legal_name: "Empresa Exemplo Ltda", trade_name: "Exemplo", cnpj: "11222333000181", person_kind: "pj",
  cpf: null, qualification_extra: null, address: "Rua A, 1", email: "contato@exemplo.com", phone: null,
  rep_name: "Maria Silva", rep_role: "Sócia", rep_cpf: null,
};

describe("dados do cliente no contrato", () => {
  it("puxa dados de pessoa jurídica", () => {
    const d = dadosDoCliente(base);
    expect(d).toMatchObject({ tipo: "pj", pj_razao: "Empresa Exemplo Ltda", pj_cnpj: "11.222.333/0001-81", rep_nome: "Maria Silva", rep_cargo: "Sócia", endereco: "Rua A, 1", email: "contato@exemplo.com", telefone: "" });
  });

  it("puxa dados de pessoa física", () => {
    const d = dadosDoCliente({ ...base, person_kind: "pf", legal_name: "João Teste", cnpj: null, cpf: "123.456.789-09", qualification_extra: "brasileiro, casado" });
    expect(d).toMatchObject({ tipo: "pf", pf_nome: "João Teste", pf_cpf: "123.456.789-09", pf_complemento: "brasileiro, casado" });
    expect(d).not.toHaveProperty("pj_razao");
  });

  it("completa só o que está vazio no cadastro", () => {
    const d = { ...defaultData(EMPTY_SETTINGS, "2026-11-23"), tipo: "pj" as const, endereco: "Outra rua", telefone: "(31) 99999-0000", rep_nome: "Outro", rep_cpf: "111.444.777-35", pj_cnpj: "11.222.333/0001-81" };
    const patch = completarCadastro(base, d);
    expect(patch).toEqual({ phone: "(31) 99999-0000", rep_cpf: "111.444.777-35" });
    expect(completarCadastro({ ...base, cnpj: null }, d).cnpj).toBe("11222333000181");
  });
});
