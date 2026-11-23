import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, PageTitle, inputClass, labelClass } from "@/components/ui";
import { formatCnpj } from "@/lib/cnpj";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "../actions";

export default async function EmpresasPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, trade_name, legal_name, cnpj, segment, status, person_kind, projects(count)")
    .order("trade_name");
  return (
    <>
      <PageTitle eyebrow="Cadastros" title="Empresas e pessoas clientes" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          {!companies?.length ? (
            <EmptyState>Nenhuma empresa cadastrada.</EmptyState>
          ) : (
            companies.map((c) => (
              <Card key={c.id} className="!p-4">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-plum">
                  {c.trade_name}
                  {c.person_kind === "pf" && <Badge tone="info">Pessoa física</Badge>}
                  <Link href={`/admin/empresas/${c.id}`} className="ml-auto inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">
                    Editar dados
                  </Link>
                </p>
                <p className="text-sm text-muted">
                  {c.legal_name}
                  {c.cnpj ? ` · CNPJ ${formatCnpj(c.cnpj)}` : ""}
                  {c.segment ? ` · ${c.segment}` : ""} · {(c.projects as unknown as { count: number }[])[0]?.count ?? 0} projeto(s)
                </p>
              </Card>
            ))
          )}
        </div>
        <Card>
          <h2 className="mb-4 font-semibold text-plum">Novo cadastro</h2>
          <ActionForm action={createCompany} submit="Cadastrar">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="person_kind">Tipo</label>
              <select id="person_kind" name="person_kind" className={inputClass} defaultValue="pj">
                <option value="pj">Empresa (pessoa jurídica)</option>
                <option value="pf">Pessoa física (ex.: mentorado sem empresa)</option>
              </select>
              <p className="text-xs text-muted">Para pessoa física, use o nome da pessoa nos dois campos de nome e deixe o CNPJ em branco.</p>
            </div>
            <div className="space-y-1"><label className={labelClass} htmlFor="trade_name">Nome fantasia</label><input id="trade_name" name="trade_name" required className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="legal_name">Razão social</label><input id="legal_name" name="legal_name" required className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="cnpj">CNPJ</label><input id="cnpj" name="cnpj" inputMode="numeric" maxLength={30} placeholder="Opcional" className={inputClass} /></div>
            <div className="space-y-1"><label className={labelClass} htmlFor="segment">Segmento</label><input id="segment" name="segment" className={inputClass} /></div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
