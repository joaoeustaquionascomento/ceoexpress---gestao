import { RequestEditPage } from "@/components/modelos/pages";

export default async function Page({ params }: { params: Promise<{ id: string; reqId: string }> }) {
  const { id, reqId } = await params;
  return <RequestEditPage area="consultor" projectId={id} requestId={reqId} />;
}
