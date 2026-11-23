import { MinutesListPage } from "@/components/atas/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MinutesListPage area="consultor" projectId={id} />;
}
