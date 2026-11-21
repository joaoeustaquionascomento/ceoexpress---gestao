import { RequestEditPage } from "@/components/modelos/pages";

export default async function Page({ params }: { params: Promise<{ id: string; reqId: string }> }) {
  const { id, reqId } = await params;
  return <RequestEditPage area="admin" projectId={id} requestId={reqId} />;
}
