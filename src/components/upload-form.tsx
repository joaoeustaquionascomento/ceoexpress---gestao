"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { finalizeUpload, prepareUpload } from "@/app/pedidos/actions";
import { contentTypeFor, formatBytes, MAX_UPLOAD_BYTES, validateUpload } from "@/lib/upload";
import { Alert, inputClass, labelClass, primaryButton } from "@/components/ui";

async function sha256Hex(file: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function UploadForm({
  requestId,
  accepted,
  checklist,
  replaceDocumentId,
  onDone,
}: {
  requestId: string;
  accepted: string[];
  checklist: string[];
  replaceDocumentId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(form: HTMLFormElement) {
    setError(null);
    setDone(null);
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Selecione um arquivo.");
    const type = contentTypeFor(file.name, file.type);
    const problem = validateUpload({ name: file.name, size: file.size, type }, accepted);
    if (problem) return setError(problem);
    if (!navigator.onLine) return setError("Sem conexão com a internet. Conecte-se e tente de novo.");

    try {
      setStep("Preparando o envio…");
      const prep = await prepareUpload({ requestId, documentId: replaceDocumentId, fileName: file.name, size: file.size, type });
      if (!prep.ok) return setError(prep.error);

      setStep("Calculando a assinatura do arquivo…");
      const hash = await sha256Hex(file);

      setStep(`Enviando ${formatBytes(file.size)}…`);
      const { error: upErr } = await createClient()
        .storage.from("documentos")
        .upload(prep.path, file, { contentType: type, upsert: false });
      if (upErr) return setError("O envio foi interrompido. Confira sua conexão e tente de novo.");

      setStep("Confirmando o recebimento…");
      const fin = await finalizeUpload({
        requestId,
        documentId: prep.documentId,
        version: prep.version,
        path: prep.path,
        fileName: file.name,
        size: file.size,
        type,
        sha256: hash,
        period: String(data.get("period") ?? ""),
        source: String(data.get("source") ?? ""),
        comment: String(data.get("comment") ?? ""),
        items: data.getAll("items").map(String),
      });
      if (!fin.ok) return setError(fin.error);

      form.reset();
      setDone(replaceDocumentId ? "Nova versão enviada. A anterior continua no histórico." : "Arquivo recebido. A consultoria vai analisar e você será avisado.");
      startTransition(() => router.refresh());
      onDone?.();
    } catch {
      setError("O envio foi interrompido. Confira sua conexão e tente de novo.");
    } finally {
      setStep(null);
    }
  }

  const busy = step !== null || pending;
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
      className="space-y-4"
    >
      {error && <Alert tone="bad">{error}</Alert>}
      {done && <Alert tone="ok">{done}</Alert>}
      <div className="space-y-1">
        <label htmlFor={`file-${replaceDocumentId ?? "novo"}`} className={labelClass}>Arquivo</label>
        <input
          id={`file-${replaceDocumentId ?? "novo"}`}
          name="file"
          type="file"
          required
          accept={accepted.map((a) => "." + a).join(",")}
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-tint file:px-4 file:font-semibold file:text-plum"
        />
        <p className="text-xs text-muted">
          {accepted.map((a) => a.toUpperCase()).join(", ")} · até {formatBytes(MAX_UPLOAD_BYTES)}
        </p>
      </div>
      {!replaceDocumentId && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="period" className={labelClass}>Período dos dados</label>
            <input id="period" name="period" placeholder="Ex.: jan a out/2026" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor="source" className={labelClass}>Fonte</label>
            <input id="source" name="source" placeholder="Ex.: sistema financeiro, contabilidade" className={inputClass} />
          </div>
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor={`comment-${replaceDocumentId ?? "novo"}`} className={labelClass}>
          {replaceDocumentId ? "O que mudou nesta versão" : "Descrição do envio"}
        </label>
        <textarea id={`comment-${replaceDocumentId ?? "novo"}`} name="comment" rows={2} className={inputClass} />
      </div>
      {!replaceDocumentId && checklist.length > 0 && (
        <fieldset className="space-y-2">
          <legend className={labelClass}>Itens atendidos por este arquivo</legend>
          {checklist.map((item) => (
            <label key={item} className="flex min-h-11 items-start gap-3 rounded-lg bg-canvas p-3 text-sm">
              <input type="checkbox" name="items" value={item} className="mt-0.5 h-5 w-5 accent-[var(--plum)]" />
              <span>{item}</span>
            </label>
          ))}
        </fieldset>
      )}
      <button type="submit" disabled={busy} aria-busy={busy} className={`${primaryButton} w-full sm:w-auto`}>
        {step ?? (replaceDocumentId ? "Enviar nova versão" : "Enviar arquivo")}
      </button>
    </form>
  );
}
