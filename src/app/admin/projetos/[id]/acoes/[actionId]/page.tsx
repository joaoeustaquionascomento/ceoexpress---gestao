import { ActionPage } from "@/components/execucao/action-page";

export default function Page(props: { params: Promise<{ id: string; actionId: string }> }) {
  return <ActionPage area="admin" {...props} />;
}
