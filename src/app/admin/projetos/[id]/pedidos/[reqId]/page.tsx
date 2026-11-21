import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestDetail } from "@/components/request-detail";
import { BackLink, PageTitle } from "@/components/ui";
import { getRequestDetail } from "@/lib/queries";
import { getProjectAccess } from "@/lib/access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function PedidoPage({ params }: { params: Promise<{ id: string; reqId: string }> }) {
  const { id, reqId } = await params;
  if (!UUID.test(id) || !UUID.test(reqId)) notFound();
  const [data, access] = await Promise.all([getRequestDetail(reqId), getProjectAccess(id)]);
  if (!data || !access || data.request.project_id !== id) notFound();
  return (
    <>
      <BackLink href={`/admin/projetos/${id}`} label="Voltar ao projeto" />
      <PageTitle eyebrow={`${data.request.code} · ${data.request.category}`} title={data.request.title} />
      {access.staff && (
        <Link href={`/admin/projetos/${id}/pedidos/${reqId}/editar`} className="mb-4 inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-mauve hover:bg-tint">
          Editar ou excluir pedido
        </Link>
      )}
      <RequestDetail data={data} access={access} />
    </>
  );
}
