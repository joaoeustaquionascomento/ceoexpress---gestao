/**
 * LGPD: mascara dados pessoais de um texto livre (transcrição ou ata) antes
 * de guardá-lo ou de enviá-lo para fora. Nomes ficam, porque a ata precisa
 * dizer quem decide e quem faz.
 */
const RULES: [RegExp, string][] = [
  // E-mail
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[E-MAIL]"],
  // CPF com ou sem pontuação (000.000.000-00 ou 00000000000)
  [/(?<![\d./-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\d/-])/g, "[CPF]"],
  // RG com a palavra "RG" na frente
  [/\bRG\s*(?:n[ºo°.]?\s*)?:?\s*[\dXx.\-]{5,14}/gi, "RG [RG]"],
  // Cartão de crédito (13 a 19 dígitos em grupos)
  [/(?<!\d)(?:\d{4}[ -]){3}\d{1,7}(?!\d)/g, "[CARTÃO]"],
  // Telefone brasileiro: (31) 99999-9999, 31 3333-3333, +55 31 99999 9999
  [/(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[TELEFONE]"],
];

export function maskPersonalData(text: string): string {
  return RULES.reduce((t, [re, rep]) => t.replace(re, rep), text);
}
