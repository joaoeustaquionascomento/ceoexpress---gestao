import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import {
  calcularParcelas,
  contractDataSchema,
  defaultData,
  lerParcelas,
  montarTexto,
  parcelasParaTexto,
  pendenciasParaGerar,
  qualificacaoContratante,
  valoresDosCampos,
  type ProviderSettings,
} from "@/lib/contratos/dados";
import { dataPorExtenso, formatarReais, inteiroPorExtenso, lerData, lerReais, reaisPorExtenso, somarMeses } from "@/lib/contratos/extenso";
import { parseBlocks } from "@/lib/contratos/markup";

vi.mock("server-only", () => ({}));

const settings: ProviderSettings = {
  provider_name: "Empresa Exemplo Ltda.",
  provider_document: "CNPJ nº 00.000.000/0001-00",
  provider_qualification: "**Empresa Exemplo Ltda.**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 00.000.000/0001-00",
  payment_instructions: "PIX, chave CNPJ nº 00.000.000/0001-00",
  default_city: "Cidade/UF",
  default_forum: "Cidade/UF",
};

/** O modelo inicial, lido da própria migração. */
function seedTemplate(): string {
  const sql = readFileSync(join(__dirname, "..", "supabase/migrations/20261122000200_contratos.sql"), "utf8");
  return sql.slice(sql.indexOf("$tpl$") + 5, sql.lastIndexOf("$tpl$"));
}

function preenchido() {
  const d = defaultData(settings, "2026-06-14");
  return contractDataSchema.parse({
    ...d,
    tipo: "pf",
    pf_nome: "Fulano de Tal",
    pf_cpf: "000.000.000-00",
    pf_complemento: "brasileiro, administrador",
    endereco: "Rua A, nº 1, Centro, Cidade/UF, CEP 00000-000",
    email: "fulano@example.com",
    servico: "Mentoria Estratégica",
    objeto: "O objeto do presente Contrato é a prestação de serviços de mentoria estratégica.",
    escopo: "## Fase 1\n- Diagnóstico\n- Plano de ação",
    duracao: "10 (dez) semanas",
    valor_total: "4.990,00",
    parcelas: parcelasParaTexto(calcularParcelas(4990, 5, "2026-06-15")),
  });
}

describe("extenso", () => {
  it("escreve números e valores", () => {
    expect(inteiroPorExtenso(4990)).toBe("quatro mil novecentos e noventa");
    expect(inteiroPorExtenso(2050)).toBe("dois mil e cinquenta");
    expect(inteiroPorExtenso(100)).toBe("cem");
    expect(reaisPorExtenso(1)).toBe("um real");
    expect(reaisPorExtenso(1000000)).toBe("um milhão de reais");
    expect(reaisPorExtenso(1.5)).toBe("um real e cinquenta centavos");
    expect(formatarReais(4990)).toBe("R$ 4.990,00");
  });
  it("lê valores e datas digitados", () => {
    expect(lerReais("4.990,00")).toBe(4990);
    expect(lerReais("R$ 1.000")).toBe(1000);
    expect(lerReais("998.5")).toBe(998.5);
    expect(lerReais("abc")).toBeNull();
    expect(lerData("15/6/2026")).toBe("2026-06-15");
    expect(lerData("31/02/2026")).toBeNull();
    expect(dataPorExtenso("2026-06-14")).toBe("14 de junho de 2026");
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("parcelas", () => {
  it("divide o total e a diferença vai para a última", () => {
    const p = calcularParcelas(1000, 3, "2026-06-15");
    expect(p.map((x) => x.valor)).toEqual([333.33, 333.33, 333.34]);
    expect(p.map((x) => x.vencimento)).toEqual(["2026-06-15", "2026-07-15", "2026-08-15"]);
  });
  it("lê as linhas digitadas e aponta erro", () => {
    expect(lerParcelas("15/06/2026 1.000,00\n15/07/2026 - R$ 990")).toEqual({
      parcelas: [
        { numero: 1, valor: 1000, vencimento: "2026-06-15" },
        { numero: 2, valor: 990, vencimento: "2026-07-15" },
      ],
    });
    expect(lerParcelas("amanhã 100")).toHaveProperty("erro");
  });
  it("cobra soma igual ao total", () => {
    const d = { ...preenchido(), parcelas: "15/06/2026 1.000,00" };
    expect(pendenciasParaGerar(d, settings).join(" ")).toMatch(/soma das parcelas/);
  });
});

describe("montagem do contrato", () => {
  it("qualifica pessoa física e jurídica", () => {
    expect(qualificacaoContratante(preenchido())).toContain("inscrito(a) no CPF sob o nº 000.000.000-00");
    const pj = contractDataSchema.parse({ tipo: "pj", pj_razao: "Cliente S.A.", pj_cnpj: "11.111.111/0001-11", rep_nome: "Maria", rep_cargo: "diretora" });
    expect(qualificacaoContratante(pj)).toBe("**Cliente S.A.**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 11.111.111/0001-11, neste ato representada por Maria, diretora");
  });

  it("o modelo inicial fica completo, sem campos faltando, e é genérico", () => {
    const tpl = seedTemplate();
    expect(tpl).not.toMatch(/FIQ|Éder|Eder|Nascimento/i);
    const d = preenchido();
    expect(pendenciasParaGerar(d, settings)).toEqual([]);
    const { texto, faltando } = montarTexto(tpl, valoresDosCampos(d, settings));
    expect(faltando).toEqual([]);
    expect(texto).toContain("R$ 4.990,00 (quatro mil novecentos e noventa reais)");
    expect(texto).toContain("- 1ª parcela: R$ 998,00 (novecentos e noventa e oito reais), com vencimento em 15/06/2026;");
    expect(texto).toContain("multa de 2% (dois por cento)");
    expect(texto).toContain("Cidade/UF, 14 de junho de 2026.");
    expect(texto).not.toContain("{{");
  });

  it("parágrafo só com campo vazio some; campo vazio no meio do texto aparece como falta", () => {
    const r = montarTexto("A\n\n{{preambulo}}\n\nValor: {{valor_total}}\n\n{{inexistente}}", { preambulo: "", valor_total: "" });
    expect(r.texto).toBe("A\n\nValor: [falta: valor_total]\n\n[falta: inexistente]");
    expect(r.faltando.sort()).toEqual(["inexistente", "valor_total"]);
  });

  it("lê a marcação", () => {
    const b = parseBlocks("# T\n\n## C\n\nlinha um\nlinha dois **forte**\n\n- item\n> centro\n---\n[[assinaturas]]");
    expect(b.map((x) => x.kind)).toEqual(["title", "heading", "paragraph", "bullet", "center", "pagebreak", "signatures"]);
    expect(b[2]).toEqual({ kind: "paragraph", spans: [{ text: "linha um linha dois ", bold: false }, { text: "forte", bold: true }] });
  });

  it("gera um PDF válido com várias páginas", async () => {
    const { contractPdf } = await import("@/lib/contratos/pdf");
    const d = preenchido();
    const { texto } = montarTexto(seedTemplate(), valoresDosCampos(d, settings));
    const bytes = await contractPdf(
      texto + "\n\nCaracteres especiais: “aspas” – travessão — ≥ ✓ 😀 ção ÁÉÍÓÚ ª º",
      { contratada: { nome: settings.provider_name, documento: settings.provider_document }, contratante: { nome: "Fulano de Tal", documento: "CPF nº 000.000.000-00" }, testemunhas: true },
      { title: "Contrato", code: "CT-2026-001", createdAt: new Date("2026-06-14T12:00:00Z") },
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    expect(doc.getTitle()).toBe("Contrato");
  });
});
