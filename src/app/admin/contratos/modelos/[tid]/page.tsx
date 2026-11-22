import { TemplateEditPage } from "@/components/contratos/pages";

export default async function Page({ params }: { params: Promise<{ tid: string }> }) {
  const { tid } = await params;
  return <TemplateEditPage templateId={tid} />;
}
