import { createHash, randomBytes } from "node:crypto";

/** Token de convite: 32 bytes aleatórios em base64url (256 bits). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O banco guarda apenas o hash SHA-256 (hex), igual ao digest() do PostgreSQL. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedToken(token: unknown): token is string {
  // 32 bytes em base64url = 43 caracteres.
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}
