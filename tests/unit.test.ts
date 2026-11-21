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
