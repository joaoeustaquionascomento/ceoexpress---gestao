import { MinutesPage } from "@/components/atas/pages";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; meetingId: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const [{ id, meetingId }, sp] = await Promise.all([params, searchParams]);
  return <MinutesPage area="consultor" projectId={id} meetingId={meetingId} edit={sp.editar === "1"} />;
}
