/**
 * Próximos passos digitados num registro (um por linha) viram ações do plano.
 * Tira marcadores do começo da linha ("-", "•", "*", "1.", "2)") e ignora
 * linhas vazias ou curtas demais. No máximo 30 passos por vez.
 */
export function splitSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-–—•*]|\d{1,2}[.)])\s*/, "").trim())
    .filter((l) => l.length >= 3)
    .map((l) => l.slice(0, 300))
    .slice(0, 30);
}
