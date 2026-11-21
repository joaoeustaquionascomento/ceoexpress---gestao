"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { generateInviteToken, hashToken } from "@/lib/tokens";

export type AdminState = { error?: string; ok?: string; link?: string } | undefined;

const company = z.object({
  legal_name: z.string().trim().min(2).max(200),
  trade_name: z.string().trim().min(2).max(120),
  cnpj: z.string().trim().max(20).optional().transform((v) => v || null),
  segment: z.string().trim().max(120).optional().transform((v) => v || null),
});

export async function createCompany(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await requireRole("admin");
  const parsed = company.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Preencha razão social e nome fantasia." };
  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({ ...parsed.data, created_by: user.id });
  if (error) return { error: error.code === "23505" ? "Já existe uma empresa com este CNPJ." : "Não foi possível salvar." };
  revalidatePath("/admin/empresas");
  return { ok: `Empresa ${parsed.data.trade_name} cadastrada.` };
}

const project = z.object({
  company_id: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  kind: z.string().trim().max(120).optional().transform((v) => v || null),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
});

export async function createProject(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await requireRole("admin");
  const parsed = project.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Escolha a empresa e informe o nome do projeto." };
  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({ ...parsed.data, created_by: user.id });
  if (error) return { error: "Não foi possível salvar o projeto." };
  revalidatePath("/admin/projetos");
  revalidatePath("/admin");
  return { ok: `Projeto ${parsed.data.name} criado.` };
}

const invite = z.object({
  email: z.string().trim().toLowerCase().email(),
  full_name: z.string().trim().max(160).optional(),
  profile: z.enum(["client_manager", "client_member", "client_viewer", "consultant", "admin"]),
  project_id: z.string().uuid().optional().or(z.literal("")),
});

export async function createInvite(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await requireRole("admin");
  const parsed = invite.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Informe um e-mail válido e o perfil." };
  const { email, full_name, profile, project_id } = parsed.data;
  const supabase = await createClient();

  let company_id: string | null = null;
  if (project_id) {
    const { data } = await supabase.from("projects").select("company_id").eq("id", project_id).maybeSingle();
    if (!data) return { error: "Projeto não encontrado." };
    company_id = data.company_id;
  } else if (profile.startsWith("client")) {
    return { error: "Usuários do cliente precisam estar vinculados a um projeto." };
  }

  const isClient = profile.startsWith("client");
  const token = generateInviteToken();
  const { error } = await supabase.from("invitations").insert({
    email,
    full_name: full_name || null,
    platform_role: isClient ? "client" : profile === "admin" ? "admin" : "consultant",
    company_id: isClient ? company_id : null,
    company_role: isClient ? profile : null,
    project_id: project_id || null,
    project_role: project_id ? (isClient ? profile : "consultant") : null,
    token_hash: hashToken(token),
    created_by: user.id,
  });
  if (error) return { error: "Não foi possível gerar o convite." };
  revalidatePath("/admin/convites");
  return {
    ok: `Convite criado para ${email}. Válido por 7 dias e para um único uso.`,
    link: `${publicEnv().NEXT_PUBLIC_SITE_URL}/convite?token=${token}`,
  };
}
