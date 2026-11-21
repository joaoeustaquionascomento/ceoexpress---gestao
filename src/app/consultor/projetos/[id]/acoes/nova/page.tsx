import { ActionEditPage } from "@/components/execucao/action-page";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <ActionEditPage area="consultor" {...props} />;
}
