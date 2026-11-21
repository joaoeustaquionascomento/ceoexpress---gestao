import { ToolPage } from "@/components/ferramentas/pages";

export default async function Page({ params }: { params: Promise<{ id: string; toolId: string }> }) {
  const { id, toolId } = await params;
  return <ToolPage area="admin" projectId={id} toolId={toolId} />;
}
