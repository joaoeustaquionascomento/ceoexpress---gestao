import { NextResponse } from "next/server";
import { buildDigest, emailConfigured, sendEmail, type DigestItem } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resumo diário por e-mail dos avisos não lidos. Chamado pelo agendador da
 * Vercel (vercel.json), que envia "Authorization: Bearer CRON_SECRET".
 * Cada aviso entra em no máximo um e-mail (marca emailed_at).
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ skipped: "RESEND_API_KEY ou EMAIL_FROM não configurados" });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString(); // não reenvia avisos antigos
  const { data: pending, error } = await admin
    .from("notifications")
    .select("id, user_id, title, link, created_at")
    .is("read_at", null)
    .is("emailed_at", null)
    .gte("created_at", since)
    .order("created_at")
    .limit(2000);
  if (error) {
    console.error("[cron avisos]", error.message);
    return NextResponse.json({ error: "falha ao ler avisos" }, { status: 500 });
  }

  const byUser = new Map<string, (DigestItem & { id: string })[]>();
  for (const n of pending ?? []) {
    const list = byUser.get(n.user_id) ?? [];
    // O link passa por /avisos/{id}, que marca o aviso como lido ao abrir.
    list.push({ ...n, link: `/avisos/${n.id}` });
    byUser.set(n.user_id, list);
  }
  if (byUser.size === 0) return NextResponse.json({ sent: 0 });

  const { data: people } = await admin.from("profiles").select("id, full_name, email").in("id", [...byUser.keys()]);
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  let sent = 0;
  let failed = 0;

  for (const p of people ?? []) {
    const items = byUser.get(p.id);
    if (!items?.length || !p.email) continue;
    const ok = await sendEmail(p.email, buildDigest(p.full_name ?? "", items, site));
    if (!ok) {
      failed++;
      continue;
    }
    sent++;
    await admin.from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", items.map((i) => i.id));
  }

  return NextResponse.json({ sent, failed });
}
