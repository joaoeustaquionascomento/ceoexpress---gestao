import { notFound } from "next/navigation";
import { ProjectView } from "@/components/project-view";
import { BackLink, PageTitle } from "@/components/ui";
import { getProject } from "@/lib/queries";

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getProject(id);
  // Sem acesso e inexistente têm a mesma resposta: o banco não devolve o projeto.
  if (!data) notFound();
  return (
    <>
      <BackLink href="/admin/projetos" />
      <PageTitle eyebrow={data.project.company?.trade_name} title={data.project.name}>
        {data.project.description}
      </PageTitle>
      <ProjectView data={data} audience="staff" />
    </>
  );
}
