import { z } from "zod";

/** Política de senha: mínimo de 10 caracteres, com letras e números. */
export const passwordSchema = z
  .string()
  .min(10, "A senha precisa ter pelo menos 10 caracteres.")
  .max(128, "A senha pode ter no máximo 128 caracteres.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letras e números na senha.");

export function checkNewPassword(password: unknown, confirm: unknown): string | null {
  const r = passwordSchema.safeParse(password);
  if (!r.success) return r.error.issues[0].message;
  if (password !== confirm) return "As senhas não coincidem.";
  return null;
}
