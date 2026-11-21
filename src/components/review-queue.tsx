import Link from "next/link";
import { Badge, EmptyState, PageTitle } from "@/components/ui";
import { getReviewQueue } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/queries";
import { REQUEST_STATUS } from "@/lib/status";

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export async function ReviewQueue({ area }: { area: "admin" | "consultor" }) {
  const items = await getReviewQueue();
  return (
    <>
      <PageTitle eyebrow="Consultoria" title="Fila de análise">
        Pedidos com documentos enviados pelo cliente, do mais antigo para o mais novo.
      </PageTitle>
      {items.length === 0 ? (
        <EmptyState>Nenhum pedido aguardando análise.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const days = daysSince(r.updated_at);
            return (
              <li key={r.id}>
                <Link
                  href={`/${area}/projetos/${r.project_id}/pedidos/${r.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 hover:border-mauve sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-rose">{r.project?.company?.trade_name} · {r.project?.name}</p>
                    <p className="font-semibold text-ink">{r.code} · {r.title}</p>
                    <p className="text-xs text-muted">Última movimentação em {formatDateTime(r.updated_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="info">{REQUEST_STATUS[r.status].label}</Badge>
                    {days >= 3 && <Badge tone="warn">Há {days} dias</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
