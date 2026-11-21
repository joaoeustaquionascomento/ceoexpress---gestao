import { Dashboard } from "@/components/dashboard";

export default function CarteiraPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Dashboard
      area="admin"
      searchParams={searchParams}
      eyebrow="Visão consolidada"
      title="Carteira de projetos"
      intro="Números calculados a partir dos registros do sistema."
    />
  );
}
