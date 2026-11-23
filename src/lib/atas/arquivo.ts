import { docxXmlToText } from "./transcricao";

/**
 * Leitura do arquivo no navegador (nada é enviado até a pessoa clicar em
 * montar a ata): .txt, .md, .vtt, .srt e .docx viram texto.
 */
export const TEXT_EXTS = ["txt", "md", "vtt", "srt", "docx"] as const;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Lê um arquivo de dentro de um .zip (o .docx é um zip). */
export async function readZipEntry(buf: ArrayBuffer, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // Fim do diretório central: assinatura 0x06054b50, procurada de trás para frente.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) return null;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const lNameLen = view.getUint16(local + 26, true);
      const lExtraLen = view.getUint16(local + 28, true);
      const start = local + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

export async function fileToText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "docx") {
    const xml = await readZipEntry(await file.arrayBuffer(), "word/document.xml");
    if (!xml) throw new Error("Não foi possível ler este arquivo do Word. Salve como .docx de novo ou cole o texto.");
    return docxXmlToText(new TextDecoder().decode(xml));
  }
  if ((TEXT_EXTS as readonly string[]).includes(ext)) return file.text();
  throw new Error("Formato não lido automaticamente. Use .docx, .txt, .vtt ou .srt, ou cole o texto.");
}
