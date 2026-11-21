/** Regras de arquivo compartilhadas entre o navegador e o servidor. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string[]> = {
  pdf: ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  doc: ["application/msword"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ppt: ["application/vnd.ms-powerpoint"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  txt: ["text/plain"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
};

export function extensionOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Retorna a mensagem de erro, ou null se o arquivo é aceito. */
export function validateUpload(
  file: { name: string; size: number; type: string },
  accepted: readonly string[],
): string | null {
  const ext = extensionOf(file.name);
  if (!file.name || file.size <= 0) return "Selecione um arquivo.";
  if (file.size > MAX_UPLOAD_BYTES) return "O arquivo passa de 25 MB. Divida-o ou compacte-o antes de enviar.";
  const allowed = accepted.map((a) => a.toLowerCase());
  if (!ext || !allowed.includes(ext)) {
    return `Formato não aceito neste pedido. Use: ${allowed.map((a) => a.toUpperCase()).join(", ")}.`;
  }
  // O navegador às vezes não informa o tipo; quando informa, precisa combinar com a extensão.
  const mimes = MIME_BY_EXT[ext];
  if (file.type && mimes && !mimes.includes(file.type) && file.type !== "application/octet-stream") {
    return "O conteúdo do arquivo não corresponde à extensão.";
  }
  return null;
}

export function contentTypeFor(name: string, reported: string): string {
  return reported && reported !== "application/octet-stream" ? reported : (MIME_BY_EXT[extensionOf(name)]?.[0] ?? "application/octet-stream");
}

/** Nome seguro para o caminho no armazenamento (sem acentos, espaços ou barras). */
export function safeFileName(name: string): string {
  const ext = extensionOf(name);
  const base = name
    .slice(0, ext ? -(ext.length + 1) : undefined)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "arquivo"}${ext ? "." + ext : ""}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
