import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { generateInviteToken, hashToken, isWellFormedToken } from "@/lib/tokens";
import { clientCanSetStatus, formatDate, progress } from "@/lib/status";

describe("tokens de convite", () => {
  it("são aleatórios, bem formados e o hash bate com o SHA-256 do banco", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(hashToken(a)).toBe(createHash("sha256").update(a).digest("hex"));
    expect(hashToken(a)).toHaveLength(64);
  });
  it("recusa formatos inválidos, inclusive a chave antiga do portal", () => {
    expect(isWellFormedToken("115348af-1c72-41c4-b9cc-57bc6ccc5851")).toBe(false);
    expect(isWellFormedToken("abc")).toBe(false);
    expect(isWellFormedToken(undefined)).toBe(false);
  });
});

describe("regras de status", () => {
  it("cliente só leva o item até Enviado", () => {
    expect(clientCanSetStatus("nao_iniciado", "enviado")).toBe(true);
    expect(clientCanSetStatus("complementacao_solicitada", "enviado")).toBe(true);
    expect(clientCanSetStatus("enviado", "aprovado")).toBe(false);
    expect(clientCanSetStatus("aprovado", "enviado")).toBe(false);
  });
  it("progresso separa recebido de aprovado e ignora não aplicáveis", () => {
    const p = progress(["nao_iniciado", "enviado", "aprovado", "nao_aplicavel"]);
    expect(p).toMatchObject({ total: 3, received: 2, approved: 1, pending: 1, receivedPct: 67, approvedPct: 33 });
    expect(progress([]).receivedPct).toBe(0);
  });
  it("formata datas sem depender do fuso horário", () => {
    expect(formatDate("2026-11-23")).toBe("23/11/2026");
    expect(formatDate(null)).toBe("Sem prazo");
  });
});

import { safeFileName, validateUpload, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/upload";

describe("validação de arquivos", () => {
  const fmts = ["pdf", "xlsx"];
  it("aceita formatos do pedido e recusa os demais", () => {
    expect(validateUpload({ name: "Contrato.PDF", size: 10, type: "application/pdf" }, fmts)).toBeNull();
    expect(validateUpload({ name: "planilha.xlsx", size: 10, type: "" }, fmts)).toBeNull();
    expect(validateUpload({ name: "foto.png", size: 10, type: "image/png" }, fmts)).toMatch(/Formato não aceito/);
    expect(validateUpload({ name: "sem-extensao", size: 10, type: "" }, fmts)).toMatch(/Formato não aceito/);
  });
  it("recusa arquivo vazio, grande demais ou com tipo trocado", () => {
    expect(validateUpload({ name: "a.pdf", size: 0, type: "application/pdf" }, fmts)).toMatch(/Selecione/);
    expect(validateUpload({ name: "a.pdf", size: MAX_UPLOAD_BYTES + 1, type: "application/pdf" }, fmts)).toMatch(/25 MB/);
    expect(validateUpload({ name: "a.pdf", size: 10, type: "application/x-msdownload" }, fmts)).toMatch(/não corresponde/);
  });
  it("gera nome seguro para o armazenamento", () => {
    expect(safeFileName("Balanço 2025 / versão final.PDF")).toBe("Balanco-2025-versao-final.pdf");
    expect(safeFileName("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFileName(".pdf")).toBe("arquivo.pdf");
  });
  it("formata tamanhos", () => {
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3,5 MB");
  });
});

describe("CNPJ", async () => {
  const { normalizeCnpj, formatCnpj } = await import("@/lib/cnpj");
  it("aceita com ou sem pontuação e recusa tamanho errado", () => {
    expect(normalizeCnpj("12.345.678/0001-90")).toBe("12345678000190");
    expect(normalizeCnpj(" 12345678000190 ")).toBe("12345678000190");
    expect(normalizeCnpj("")).toBeNull();
    expect(normalizeCnpj(undefined)).toBeNull();
    expect(normalizeCnpj("123")).toBe("invalido");
    expect(formatCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });
});

import { splitSteps } from "@/lib/registros";
import { nextCode } from "@/lib/codigos";

describe("Próximos passos de um registro", () => {
  it("separa um passo por linha e tira marcadores", () => {
    expect(splitSteps("- Enviar a apresentação\n• Formalizar o comissionamento\n\n1. Treinar a equipe\n2) Gravar vídeo\nok")).toEqual([
      "Enviar a apresentação",
      "Formalizar o comissionamento",
      "Treinar a equipe",
      "Gravar vídeo",
    ]);
    expect(splitSteps("")).toEqual([]);
    expect(splitSteps("a\r\nPasso com CRLF\r\n")).toEqual(["Passo com CRLF"]);
  });
  it("limita a 30 passos", () => {
    expect(splitSteps(Array.from({ length: 40 }, (_, i) => `Passo ${i}`).join("\n"))).toHaveLength(30);
  });
  it("numera registros como RG-01, RG-02", () => {
    expect(nextCode("RG", [])).toBe("RG-01");
    expect(nextCode("RG", ["RG-01", "D03", null, "RG-09"])).toBe("RG-10");
  });
});
