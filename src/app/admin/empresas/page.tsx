import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageTitle, inputClass, labelClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "../actions";

export default async function EmpresasPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, trade_name, legal_name, cnpj, segment, status, projects(count)")
    .order("trade_name");
  return (
    <>
      <PageTitle eyebrow="Cadastros" title="Empresas clientes" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          {!companies?.length ? (
            <EmptyState>Nenhuma empresa cadastrada.</EmptyState>
          ) : (
            companies.map((c) => (
              <Card key={c.id} className="!p-4">
                <p className="font-semibold text-plum">{c.trade_name}</p>
                <p className="text-sm text-muted">
                  {c.legal_name}
                  {c.cnpj ? ` · CNPJ ${c.cnpj}` : ""}
                  {c.segment ? ` · ${c.segment}` : ""} · {(c.projects as unknown as { count: number }[])[0]?.count ?? 0} projeto(s)
                </p>
              </Card>
            ))
          )}
        </div>
        <Card>
          <h2 className="mb-4 font-semibold text-plum">Nova empresa</h2>
          <ActionForm action={createCompany} submit="Cadastrar empresa">
            <div className="space-y-1"><label className={labelClass} htmlFor="trade_name">Nome fantasia</label><input id="trade_name" name="trade_name" required className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="legal_name">Razão social</label><input id="legal_name" name="legal_name" required className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="cnpj">CNPJ</label><input id="cnpj" name="cnpj" inputMode="numeric" className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="segment">Segmento</label><input id="segment" name="segment" className={inputClass} /></div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
