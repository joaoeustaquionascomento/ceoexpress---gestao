import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PlatformRole = "admin" | "consultant" | "client";
export type SessionUser = { id: string; email: string; fullName: string; role: PlatformRole };

/** Usuário da requisição, verificado no servidor do Supabase (getUser, não o cookie cru). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, platform_role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: data.user.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.platform_role as PlatformRole,
  };
});

export function homeFor(role: PlatformRole) {
  return role === "admin" ? "/admin" : role === "consultant" ? "/consultor" : "/cliente";
}

/** Exige login e um dos papéis informados; caso contrário, redireciona. */
export async function requireRole(...roles: PlatformRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Só aceita redirecionamentos internos (evita open redirect após o login). */
export function safeNext(next: unknown, fallback = "/"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
