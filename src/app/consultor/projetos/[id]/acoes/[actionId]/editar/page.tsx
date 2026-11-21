import { ActionEditPage } from "@/components/execucao/action-page";

export default function Page(props: { params: Promise<{ id: string; actionId: string }> }) {
  return <ActionEditPage area="consultor" {...props} />;
}
