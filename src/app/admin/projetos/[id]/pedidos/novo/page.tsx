import { RequestEditPage } from "@/components/modelos/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestEditPage area="admin" projectId={id} />;
}
