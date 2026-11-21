import { RequestTemplateEditPage } from "@/components/modelos/pages";

export default async function Page({ params }: { params: Promise<{ tid: string }> }) {
  const { tid } = await params;
  return <RequestTemplateEditPage templateId={tid} />;
}
