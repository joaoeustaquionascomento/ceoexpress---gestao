import { Dashboard } from "@/components/dashboard";

export default function ConsultorPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Dashboard
      area="consultor"
      searchParams={searchParams}
      eyebrow="Execução"
      title="Meus projetos"
      intro="Somente os projetos em que você está alocado."
    />
  );
}
