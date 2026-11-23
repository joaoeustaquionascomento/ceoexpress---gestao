import { ContractPage } from "@/components/contratos/pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractPage contractId={id} />;
}
