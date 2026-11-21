/** CNPJ aceito com ou sem pontuação; gravado só com os 14 dígitos. */
export function normalizeCnpj(v: string | undefined | null): string | null | "invalido" {
  const digits = (v ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 14 ? digits : "invalido";
}

/** 12345678000190 → 12.345.678/0001-90 */
export function formatCnpj(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : (v ?? "");
}
