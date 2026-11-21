import { ActionTemplateEditPage } from "@/components/modelos/pages";

export default async function Page({ params }: { params: Promise<{ tid: string }> }) {
  const { tid } = await params;
  return <ActionTemplateEditPage templateId={tid} />;
}
