import { ReportPage } from "@/components/relatorios/pages";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reportId: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const [{ id, reportId }, sp] = await Promise.all([params, searchParams]);
  return <ReportPage area="consultor" projectId={id} reportId={reportId} edit={sp.editar === "1"} />;
}
