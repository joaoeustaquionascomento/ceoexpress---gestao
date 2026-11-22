import { MentoriaListPage } from "@/components/mentoria/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MentoriaListPage area="admin" projectId={id} />;
}
