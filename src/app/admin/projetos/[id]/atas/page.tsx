import { MinutesListPage } from "@/components/atas/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MinutesListPage area="admin" projectId={id} />;
}
