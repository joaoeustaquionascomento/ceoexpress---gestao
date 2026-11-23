"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { generateInviteToken, hashToken } from "@/lib/tokens";
import { normalizeCnpj } from "@/lib/cnpj";

export type AdminState = { error?: string; ok?: string; link?: string } | undefined;

const company = z.object({
  legal_name: z.string({ error: "Preencha a razão social." }).trim().min(2, "Preencha a razão social.").max(200, "Razão social muito longa (máximo 200 caracteres)."),
  trade_name: z.string({ error: "Preencha o nome fantasia." }).trim().min(2, "Preencha o nome fantasia (ao menos 2 letras).").max(120, "Nome fantasia muito longo (máximo 120 caracteres)."),
  cnpj: z
    .string()
    .optional()
    .transform((v) => normalizeCnpj(v))
    .refine((v) => v !== "invalido", "O CNPJ precisa ter 14 números. Pode deixar em branco."),
  segment: z.string().trim().max(120, "Segmento muito longo (máximo 120 caracteres).").optional().transform((v) => v || null),
  person_kind: z.enum(["pj", "pf"]).default("pj"),
}).refine((c) => c.person_kind === "pj" || !c.cnpj, { message: "Pessoa física não tem CNPJ. Deixe o campo em branco." });

export async function createCompany(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await requireRole("admin");
  const parsed = company.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({ ...parsed.data, created_by: user.id });
  if (error) {
    console.error("createCompany", error.code, error.message);
    return { error: error.code === "23505" ? "Já existe uma empresa com este CNPJ." : `Não foi possível salvar (código ${error.code ?? "?"}).` };
  }
  revalidatePath("/admin/empresas");
  return { ok: `Empresa ${parsed.data.trade_name} cadastrada.` };
}

const optional = (max: number, msg: string) => z.string().trim().max(max, msg).optional().transform((v) => v || null);

/** Dados de qualificação usados nos contratos (todos opcionais). */
const companyDetails = z.object({
  cpf: optional(20, "CPF muito longo."),
  qualification_extra: optional(300, "Texto muito longo (máximo 300 caracteres)."),
  address: optional(400, "Endereço muito longo (máximo 400 caracteres)."),
  email: optional(200, "E-mail muito longo.").refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Confira o e-mail."),
  phone: optional(40, "Telefone muito longo."),
  rep_name: optional(200, "Nome do representante muito longo."),
  rep_role: optional(100, "Cargo muito longo."),
  rep_cpf: optional(20, "CPF do representante muito longo."),
});

export async function updateCompany(_: AdminState, form: FormData): Promise<AdminState> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(form.get("companyId"));
  if (!id.success) return { error: "Cadastro não encontrado." };
  const base = company.safeParse(Object.fromEntries(form));
  if (!base.success) return { error: base.error.issues[0]?.message ?? "Confira os campos." };
  const details = companyDetails.safeParse(Object.fromEntries(form));
  if (!details.success) return { error: details.error.issues[0]?.message ?? "Confira os campos." };
  const pf = base.data.person_kind === "pf";
  const row = {
    ...base.data,
    ...details.data,
    // Cada tipo guarda só o que é dele.
    ...(pf ? { rep_name: null, rep_role: null, rep_cpf: null } : { cpf: null, qualification_extra: null }),
  };
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update(row).eq("id", id.data);
  if (error) {
    console.error("updateCompany", error.code, error.message);
    return { error: error.code === "23505" ? "Já existe uma empresa com este CNPJ." : `Não foi possível salvar (código ${error.code ?? "?"}).` };
  }
  revalidatePath("/admin/empresas", "layout");
  return { ok: "Cadastro atualizado. Os próximos contratos já vêm com estes dados." };
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
  const { data, error } = await supabase.from("projects").insert({ ...parsed.data, created_by: user.id }).select("id").single();
  if (error || !data) return { error: "Não foi possível salvar o projeto." };
  revalidatePath("/admin/projetos");
  revalidatePath("/admin");
  // Próximo passo: escolher os pedidos e as ações da biblioteca de modelos.
  redirect(`/admin/projetos/${data.id}/modelos?novo=1`);
}

const projectEdit = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Informe o nome do projeto.").max(200),
  kind: z.string().trim().max(120).optional().transform((v) => v || null),
  status: z.enum(["planejado", "ativo", "pausado", "encerrado"]),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
});

function refreshProjects(id: string) {
  revalidatePath("/admin/projetos");
  revalidatePath("/admin");
  for (const a of ["admin", "consultor", "cliente"]) revalidatePath(`/${a}/projetos/${id}`, "layout");
}

/** Altera nome, tipo de serviço, situação, início e descrição do projeto. */
export async function updateProject(_: AdminState, form: FormData): Promise<AdminState> {
  await requireRole("admin");
  const parsed = projectEdit.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(row).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar o projeto." };
  refreshProjects(id);
  return { ok: "Projeto atualizado." };
}

/**
 * Exclui o projeto e tudo o que é dele (pedidos, arquivos, ações, agenda,
 * ferramentas, relatórios e avaliações). Exige digitar o nome do projeto.
 */
export async function deleteProject(_: AdminState, form: FormData): Promise<AdminState> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Projeto inválido." };
  const supabase = await createClient();
  const { data: proj } = await supabase.from("projects").select("name").eq("id", id.data).maybeSingle();
  if (!proj) return { error: "Projeto não encontrado." };
  const typed = String(form.get("confirm") ?? "").trim();
  if (typed.toLocaleLowerCase("pt-BR") !== proj.name.trim().toLocaleLowerCase("pt-BR")) {
    return { error: `Para confirmar, digite o nome do projeto exatamente: ${proj.name}` };
  }
  // Arquivos enviados ficam no armazenamento: apaga antes, enquanto ainda sabemos quais são.
  const { data: docs } = await supabase.from("documents").select("id").eq("project_id", id.data);
  const docIds = (docs ?? []).map((d) => d.id);
  if (docIds.length) {
    const { data: versions } = await supabase.from("document_versions").select("storage_path").in("document_id", docIds);
    const paths = (versions ?? []).map((v) => v.storage_path).filter(Boolean);
    if (paths.length) {
      const admin = createAdminClient();
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from("documentos").remove(paths.slice(i, i + 100));
        if (error) {
          console.error("deleteProject storage", error.message);
          return { error: "Não foi possível apagar os arquivos do projeto. Nada foi excluído." };
        }
      }
    }
  }
  const { error } = await supabase.from("projects").delete().eq("id", id.data);
  if (error) {
    console.error("deleteProject", error.code, error.message);
    return { error: "Não foi possível excluir o projeto." };
  }
  refreshProjects(id.data);
  redirect("/admin/projetos");
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
