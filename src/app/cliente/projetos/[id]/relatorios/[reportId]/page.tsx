import { ReportPage } from "@/components/relatorios/pages";

export default async function Page({ params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params;
  return <ReportPage area="cliente" projectId={id} reportId={reportId} edit={false} />;
}
