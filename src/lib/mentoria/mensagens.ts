/** E-mail de convite para responder avaliações de mentoria. */

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function buildInviteEmail(name: string, links: { name: string; url: string }[]) {
  const first = name.trim().split(/\s+/)[0] || "Olá";
  const subject = links.length === 1 ? "CEOEXPRESS: sua avaliação de mentoria" : "CEOEXPRESS: suas avaliações de mentoria";
  const text = [
    `Olá, ${first}!`,
    "",
    `Preparei ${links.length === 1 ? "uma avaliação" : `${links.length} avaliações`} para a nossa mentoria. Cada uma leva poucos minutos e pode ser respondida pelo celular.`,
    "",
    ...links.map((l) => `${l.name}: ${l.url}`),
    "",
    "Suas respostas são confidenciais e usadas só na mentoria.",
  ].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f3f5;font-family:Arial,Helvetica,sans-serif;color:#2b1d26">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a35a7a;margin:0 0 4px">CEOEXPRESS | Mentoria</p>
<h1 style="font-size:20px;color:#4a2340;margin:0 0 12px">Olá, ${esc(first)}!</h1>
<p>Preparei ${links.length === 1 ? "uma avaliação" : `${links.length} avaliações`} para a nossa mentoria. Cada uma leva poucos minutos e pode ser respondida pelo celular.</p>
${links
  .map(
    (l) =>
      `<p style="margin:12px 0"><a href="${esc(l.url)}" style="display:inline-block;background:#4a2340;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${esc(l.name)}</a></p>`,
  )
  .join("\n")}
<p style="font-size:12px;color:#6b5a64;margin-top:24px">Suas respostas são confidenciais e usadas só na mentoria.</p>
</div></body></html>`;
  return { subject, text, html };
}
