/** Funções puras para mostrar o registro de auditoria (sem acesso ao banco). */

export const AUDIT_ENTITY: Record<string, string> = {
  companies: "Empresa",
  memberships: "Vínculo com empresa",
  projects: "Projeto",
  project_members: "Membro do projeto",
  invitations: "Convite",
  info_requests: "Pedido de informação",
  documents: "Documento",
  document_versions: "Versão de documento",
  objectives: "Objetivo",
  action_items: "Ação do plano",
  milestones: "Marco",
  meetings: "Encontro",
  decisions: "Decisão",
};

export const AUDIT_ACTION: Record<string, string> = {
  insert: "Criou",
  update: "Alterou",
  delete: "Excluiu",
};

/** Campos técnicos que mudam sozinhos e só poluem a lista. */
const NOISE = new Set(["updated_at", "created_at", "id", "company_id", "search", "token_hash"]);

type Row = Record<string, unknown> | null | undefined;

/** Nomes dos campos que mudaram numa alteração. */
export function changedFields(before: Row, after: Row): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => !NOISE.has(k) && JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .sort();
}

/** Um rótulo legível do registro afetado (código, nome ou título). */
export function recordLabel(before: Row, after: Row): string {
  const r = after ?? before ?? {};
  const pick = (k: string) => (typeof r[k] === "string" && (r[k] as string).trim() ? (r[k] as string) : null);
  const code = pick("code");
  const name = pick("title") ?? pick("name") ?? pick("trade_name") ?? pick("summary") ?? pick("file_name") ?? pick("email");
  if (code && name) return `${code} · ${name}`;
  return code ?? name ?? "";
}
