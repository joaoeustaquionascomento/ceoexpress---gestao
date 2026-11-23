import { notFound } from "next/navigation";
import { CompanyEditForm } from "@/components/company-edit-form";
import { BackLink, Card, PageTitle } from "@/components/ui";
import { COMPANY_FIELDS, type CompanyRecord } from "@/lib/contratos/cliente";
import { createClient } from "@/lib/supabase/server";

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select(`${COMPANY_FIELDS}, segment`).eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as CompanyRecord & { segment: string | null };
  return (
    <>
      <BackLink href="/admin/empresas" label="Voltar aos cadastros" />
      <PageTitle eyebrow="Cadastros" title={c.trade_name}>
        Estes dados entram automaticamente nos contratos deste cliente.
      </PageTitle>
      <Card className="max-w-3xl">
        <CompanyEditForm company={c} />
      </Card>
    </>
  );
}
