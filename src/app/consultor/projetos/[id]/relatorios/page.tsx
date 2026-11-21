import { ReportsListPage } from "@/components/relatorios/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportsListPage area="consultor" projectId={id} />;
}
