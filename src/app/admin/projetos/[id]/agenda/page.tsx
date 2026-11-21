import { AgendaPage } from "@/components/execucao/agenda-page";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <AgendaPage area="admin" {...props} />;
}
