import { MentoriaReportPage } from "@/components/mentoria/pages";

export default async function Page({ params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params;
  return <MentoriaReportPage area="admin" projectId={id} appId={appId} />;
}
