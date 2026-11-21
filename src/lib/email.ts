/**
 * E-mails transacionais via API da Resend. Sem RESEND_API_KEY e EMAIL_FROM
 * configurados, nada é enviado (o app continua funcionando só com os avisos internos).
 */

export type DigestItem = { title: string; link: string | null; created_at: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function absolute(siteUrl: string, link: string | null): string {
  const base = siteUrl.replace(/\/+$/, "");
  if (!link) return `${base}/`;
  return link.startsWith("/") ? `${base}${link}` : `${base}/`;
}

/** Monta o resumo diário de avisos não lidos de uma pessoa. */
export function buildDigest(name: string, items: DigestItem[], siteUrl: string, max = 20) {
  const first = name.trim().split(/\s+/)[0] || "Olá";
  const n = items.length;
  const subject = n === 1 ? "CEOEXPRESS: você tem 1 aviso novo" : `CEOEXPRESS: você tem ${n} avisos novos`;
  const shown = items.slice(0, max);
  const rest = n - shown.length;
  const home = absolute(siteUrl, null);

  const text = [
    `${first}, você tem ${n === 1 ? "1 aviso novo" : `${n} avisos novos`} no CEOEXPRESS | Gestão Estratégica:`,
    "",
    ...shown.map((i) => `- ${i.title}\n  ${absolute(siteUrl, i.link)}`),
    ...(rest > 0 ? [`- e mais ${rest} aviso(s) no sistema.`] : []),
    "",
    `Abrir o sistema: ${home}`,
    "",
    "Você recebe este resumo uma vez por dia quando há avisos não lidos.",
  ].join("\n");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f3f5;font-family:Arial,Helvetica,sans-serif;color:#2b1d26">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a35a7a;margin:0 0 4px">CEOEXPRESS | Gestão Estratégica</p>
<h1 style="font-size:20px;color:#4a2340;margin:0 0 16px">${esc(first)}, você tem ${n === 1 ? "1 aviso novo" : `${n} avisos novos`}</h1>
<ul style="padding:0;margin:0 0 16px;list-style:none">
${shown
  .map(
    (i) =>
      `<li style="background:#fff;border:1px solid #e8dde3;border-radius:10px;padding:12px;margin-bottom:8px"><a href="${esc(absolute(siteUrl, i.link))}" style="color:#4a2340;text-decoration:none;font-weight:bold">${esc(i.title)}</a></li>`,
  )
  .join("\n")}
${rest > 0 ? `<li style="color:#6b5a64;padding:4px 0">e mais ${rest} aviso(s) no sistema.</li>` : ""}
</ul>
<p><a href="${esc(home)}" style="display:inline-block;background:#4a2340;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">Abrir o sistema</a></p>
<p style="font-size:12px;color:#6b5a64;margin-top:24px">Você recebe este resumo uma vez por dia quando há avisos não lidos.</p>
</div></body></html>`;

  return { subject, text, html };
}

export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) console.error("[email] Resend respondeu", res.status, (await res.text()).slice(0, 300));
  return res.ok;
}
