import { TemplateEditPage } from "@/components/contratos/pages";

export default async function Page({ searchParams }: { searchParams: Promise<{ copiar?: string }> }) {
  const { copiar } = await searchParams;
  return <TemplateEditPage copyFrom={copiar} />;
}
