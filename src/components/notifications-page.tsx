import Link from "next/link";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { markAllNotificationsRead } from "@/app/pedidos/actions";
import { formatDateTime } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <>
      <PageTitle title="Avisos">Documentos recebidos, análises da consultoria e novas mensagens.</PageTitle>
      {unread > 0 && (
        <form action={markAllNotificationsRead} className="mb-4">
          <SubmitButton pendingText="Marcando…">Marcar todos como lidos</SubmitButton>
        </form>
      )}
      {items.length === 0 ? (
        <EmptyState>Nenhum aviso por enquanto.</EmptyState>
      ) : (
        <Card className="divide-y divide-line p-0">
          <ul>
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/avisos/${n.id}`}
                  className="flex min-h-14 flex-col gap-1 px-4 py-3 hover:bg-tint sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className={n.read_at ? "text-muted" : "font-semibold text-ink"}>
                    {!n.read_at && <span className="mr-2 inline-block size-2 rounded-full bg-rose" aria-label="Não lido" />}
                    {n.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
