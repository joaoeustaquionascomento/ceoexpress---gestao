import { ToolsListPage } from "@/components/ferramentas/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ToolsListPage area="admin" projectId={id} />;
}
