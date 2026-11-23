import { ContractEditPage } from "@/components/contratos/pages";

export default async function Page({ searchParams }: { searchParams: Promise<{ modelo?: string }> }) {
  const { modelo } = await searchParams;
  return <ContractEditPage modelo={modelo} />;
}
