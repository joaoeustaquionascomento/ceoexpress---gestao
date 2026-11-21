"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProjectAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { safeFileName, validateUpload } from "@/lib/upload";
import { clientCanSetStatus, type RequestStatus } from "@/lib/status";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const uuid = z.string().uuid();
const BUCKET = "documentos";

function refresh(projectId: string, requestId: string) {
  for (const area of ["admin", "consultor", "cliente"]) {
    revalidatePath(`/${area}/projetos/${projectId}`);
    revalidatePath(`/${area}/projetos/${projectId}/pedidos/${requestId}`);
  }
}

async function loadRequest(requestId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("info_requests")
    .select("id, project_id, company_id, status, accepted_formats, stage, title")
    .eq("id", requestId)
    .maybeSingle();
  return { supabase, request: data };
}

// ---------------------------------------------------------------------------
// Envio de arquivo em 3 passos: (1) o servidor confere a permissão e reserva o
// caminho; (2) o navegador envia o arquivo direto ao armazenamento, onde a
// regra do bucket confere de novo; (3) o servidor confirma o arquivo e grava
// a versão. Assim arquivos de até 25 MB não passam pelo servidor do app.
// ---------------------------------------------------------------------------

const prepareSchema = z.object({
  requestId: uuid,
  documentId: uuid.optional(),
  fileName: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().max(200),
});

export async function prepareUpload(
  input: z.infer<typeof prepareSchema>,
): Promise<Result<{ documentId: string; version: number; path: string }>> {
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do arquivo inválidos." };
  const { requestId, documentId, fileName, size, type } = parsed.data;

  const { supabase, request } = await loadRequest(requestId);
  if (!request) return { ok: false, error: "Pedido não encontrado." };
  const access = await getProjectAccess(request.project_id);
  if (!access?.canUpload) return { ok: false, error: "Seu perfil não permite enviar arquivos neste projeto." };
  if (!access.staff && !clientCanSetStatus(request.status as RequestStatus, "enviado")) {
    return { ok: false, error: "Este pedido está em análise ou já foi concluído pela consultoria." };
  }
  const problem = validateUpload({ name: fileName, size, type }, request.accepted_formats);
  if (problem) return { ok: false, error: problem };

  let docId = documentId;
  let version = 1;
  if (docId) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id, created_by, info_request_id, deleted_at")
      .eq("id", docId)
      .maybeSingle();
    if (!doc || doc.info_request_id !== requestId || doc.deleted_at) return { ok: false, error: "Documento não encontrado." };
    if (!access.staff && doc.created_by !== access.userId) return { ok: false, error: "Só quem enviou pode substituir este arquivo." };
    const { data: last } = await supabase
      .from("document_versions")
      .select("version")
      .eq("document_id", docId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    version = (last?.version ?? 0) + 1;
  } else {
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        project_id: request.project_id,
        company_id: request.company_id,
        info_request_id: requestId,
        title: fileName.slice(0, 200),
        folder: request.stage ?? "01_DOCUMENTOS_INSTITUCIONAIS",
        origin: access.staff ? "consultoria" : "cliente",
        visibility: "client",
        created_by: access.userId,
      })
      .select("id")
      .single();
    if (error || !doc) return { ok: false, error: "Não foi possível registrar o documento." };
    docId = doc.id;
  }

  const path = `${request.company_id}/${request.project_id}/${docId}/v${version}-${safeFileName(fileName)}`;
  return { ok: true, documentId: docId!, version, path };
}

const finalizeSchema = z.object({
  requestId: uuid,
  documentId: uuid,
  version: z.number().int().positive(),
  path: z.string().min(10).max(500),
  fileName: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().max(200),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  period: z.string().trim().max(200).optional(),
  source: z.string().trim().max(500).optional(),
  comment: z.string().trim().max(4000).optional(),
  items: z.array(z.string().max(500)).max(30).default([]),
});

export async function finalizeUpload(input: z.infer<typeof finalizeSchema>): Promise<Result> {
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do envio inválidos." };
  const d = parsed.data;
  const { supabase, request } = await loadRequest(d.requestId);
  if (!request) return { ok: false, error: "Pedido não encontrado." };
  const access = await getProjectAccess(request.project_id);
  if (!access?.canUpload) return { ok: false, error: "Sem permissão." };

  const prefix = `${request.company_id}/${request.project_id}/${d.documentId}/`;
  if (!d.path.startsWith(prefix) || d.path.includes("..")) return { ok: false, error: "Caminho de arquivo inválido." };

  // Confere se o arquivo chegou ao armazenamento e tem o tamanho informado.
  const fileName = d.path.slice(prefix.length);
  const { data: listed } = await supabase.storage.from(BUCKET).list(prefix.slice(0, -1), { search: fileName });
  const stored = listed?.find((o) => o.name === fileName);
  const storedSize = (stored?.metadata as { size?: number } | undefined)?.size;
  if (!stored || (storedSize !== undefined && storedSize !== d.size)) {
    return { ok: false, error: "O arquivo não chegou completo. Tente enviar de novo." };
  }

  const { error } = await supabase.from("document_versions").insert({
    document_id: d.documentId,
    company_id: request.company_id,
    version: d.version,
    storage_path: d.path,
    file_name: d.fileName.slice(0, 255),
    mime_type: d.type || "application/octet-stream",
    size_bytes: d.size,
    sha256: d.sha256,
    period: d.period || null,
    source: d.source || null,
    comment: d.comment || null,
    checklist_items: d.items,
    uploaded_by: access.userId,
  });
  if (error) return { ok: false, error: "Não foi possível registrar o arquivo. Tente novamente." };

  // Enviar marca o pedido como "Enviado" (recebido, ainda não validado).
  if (!access.staff && clientCanSetStatus(request.status as RequestStatus, "enviado") && request.status !== "enviado") {
    await supabase.from("info_requests").update({ status: "enviado" }).eq("id", d.requestId);
  }
  refresh(request.project_id, d.requestId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Exclusão e recuperação
// ---------------------------------------------------------------------------
export async function deleteDocument(documentId: string, requestId: string, projectId: string): Promise<Result> {
  if (!uuid.safeParse(documentId).success) return { ok: false, error: "Documento inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("soft_delete_document", { p_document: documentId });
  if (error) return { ok: false, error: error.message.includes("outra pessoa") ? "Só quem enviou pode excluir." : "Não foi possível excluir." };
  refresh(projectId, requestId);
  return { ok: true };
}

export async function restoreDocument(documentId: string, requestId: string, projectId: string): Promise<Result> {
  if (!uuid.safeParse(documentId).success) return { ok: false, error: "Documento inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_document", { p_document: documentId });
  if (error) return { ok: false, error: "Não foi possível recuperar." };
  refresh(projectId, requestId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Análise pela consultoria e mensagens
// ---------------------------------------------------------------------------
export type FormResult = { error?: string; ok?: string } | undefined;

const STAFF_STATUS = ["nao_iniciado", "em_analise", "complementacao_solicitada", "aprovado", "nao_aplicavel", "enviado"] as const;

export async function reviewRequest(_: FormResult, form: FormData): Promise<FormResult> {
  const requestId = uuid.safeParse(form.get("requestId"));
  const status = z.enum(STAFF_STATUS).safeParse(form.get("status"));
  const message = z.string().trim().max(4000).safeParse(form.get("message") ?? "");
  if (!requestId.success || !status.success || !message.success) return { error: "Escolha uma decisão." };
  const { supabase, request } = await loadRequest(requestId.data);
  if (!request) return { error: "Pedido não encontrado." };
  const access = await getProjectAccess(request.project_id);
  if (!access?.staff) return { error: "Somente a consultoria analisa pedidos." };
  if (status.data === "complementacao_solicitada" && !message.data) {
    return { error: "Explique ao cliente o que precisa ser complementado." };
  }
  if (message.data) {
    const { error } = await supabase.from("comments").insert({
      project_id: request.project_id,
      company_id: request.company_id,
      target_type: "info_request",
      target_id: request.id,
      body: message.data,
      visibility: "client",
      author_id: access.userId,
    });
    if (error) return { error: "Não foi possível registrar a mensagem." };
  }
  const { error } = await supabase.from("info_requests").update({ status: status.data }).eq("id", request.id);
  if (error) return { error: "Não foi possível atualizar o status." };
  refresh(request.project_id, request.id);
  return { ok: "Status atualizado. O cliente foi notificado." };
}

export async function assignRequest(_: FormResult, form: FormData): Promise<FormResult> {
  const requestId = uuid.safeParse(form.get("requestId"));
  const raw = form.get("assignee");
  const assignee = raw ? uuid.safeParse(raw) : { success: true as const, data: null };
  if (!requestId.success || !assignee.success) return { error: "Escolha o responsável." };
  const { supabase, request } = await loadRequest(requestId.data);
  if (!request) return { error: "Pedido não encontrado." };
  const access = await getProjectAccess(request.project_id);
  if (!access?.staff) return { error: "Somente a consultoria define responsáveis." };
  if (assignee.data) {
    const { data: member } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", request.project_id)
      .eq("user_id", assignee.data)
      .maybeSingle();
    if (!member) return { error: "Essa pessoa não participa do projeto." };
  }
  const { error } = await supabase.from("info_requests").update({ assigned_to: assignee.data }).eq("id", request.id);
  if (error) return { error: "Não foi possível salvar." };
  refresh(request.project_id, request.id);
  return { ok: "Responsável atualizado." };
}

export async function addComment(_: FormResult, form: FormData): Promise<FormResult> {
  const requestId = uuid.safeParse(form.get("requestId"));
  const body = z.string().trim().min(1).max(4000).safeParse(form.get("body"));
  if (!requestId.success || !body.success) return { error: "Escreva a mensagem." };
  const { supabase, request } = await loadRequest(requestId.data);
  if (!request) return { error: "Pedido não encontrado." };
  const access = await getProjectAccess(request.project_id);
  if (!access) return { error: "Sem acesso." };
  if (!access.staff && access.role === "client_viewer") return { error: "Seu perfil é apenas de consulta." };
  const internal = access.staff && form.get("internal") === "on";
  const { error } = await supabase.from("comments").insert({
    project_id: request.project_id,
    company_id: request.company_id,
    target_type: "info_request",
    target_id: request.id,
    body: body.data,
    visibility: internal ? "internal" : "client",
    author_id: access.userId,
  });
  if (error) return { error: "Não foi possível enviar a mensagem." };
  refresh(request.project_id, request.id);
  return { ok: internal ? "Nota interna registrada." : "Mensagem enviada." };
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
}
