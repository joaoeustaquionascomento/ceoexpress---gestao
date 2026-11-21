import { ApplyTemplatesPage } from "@/components/modelos/pages";

export default async function Page({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <ApplyTemplatesPage area="consultor" projectId={id} novo={sp.novo === "1"} />;
}
