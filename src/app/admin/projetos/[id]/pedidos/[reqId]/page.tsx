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
      <RequestDetail data={data} access={access} />
    </>
  );
}
