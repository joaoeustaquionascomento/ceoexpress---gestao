import { PlanPage } from "@/components/execucao/plan-page";

export default function Page(props: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  return <PlanPage area="cliente" {...props} />;
}
