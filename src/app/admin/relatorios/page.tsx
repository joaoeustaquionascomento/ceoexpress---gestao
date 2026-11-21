import { Card, EmptyState, PageTitle, Stat } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { aiConfigured } from "@/lib/relatorios/ia";
import { createClient } from "@/lib/supabase/server";

/** Uso dos relatórios automáticos por mês, para decidir quando vale ligar a IA. */
export default async function Page() {
  await requireRole("admin");
  const supabase = await createClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  const { data } = await supabase
    .from("analysis_reports")
    .select("created_at, engine, tool_id, status, visibility, usage")
    .gte("created_at", since.toISOString().slice(0, 10))
    .order("created_at", { ascending: false })
    .limit(10000);
  const rows = data ?? [];

  type Month = { projeto: number; ferramenta: number; ia: number; revisados: number; compartilhados: number; tokensIn: number; tokensOut: number };
  const months = new Map<string, Month>();
  for (const r of rows) {
    const key = new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
    const m = months.get(key) ?? { projeto: 0, ferramenta: 0, ia: 0, revisados: 0, compartilhados: 0, tokensIn: 0, tokensOut: 0 };
    if (r.tool_id) m.ferramenta++;
    else m.projeto++;
    if (r.engine === "ia") {
      m.ia++;
      const u = (r.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
      m.tokensIn += u.input_tokens ?? 0;
      m.tokensOut += u.output_tokens ?? 0;
    }
    if (r.status === "revisado") m.revisados++;
    if (r.visibility === "client") m.compartilhados++;
    months.set(key, m);
  }
  const list = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const label = (k: string) => {
    const [y, m] = k.split("-");
    return new Date(Number(y), Number(m) - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };
  const current = list[0]?.[1];
  const total = rows.length;

  return (
    <>
      <PageTitle eyebrow="Administração" title="Uso de relatórios">
        Quantos relatórios e análises automáticas foram gerados por mês, em todos os projetos. Use para avaliar quando vale ligar a análise com IA.
      </PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Últimos 12 meses" value={total} hint="relatórios e análises" />
        <Stat label="Mês mais recente" value={current ? current.projeto + current.ferramenta : 0} hint={list[0] ? label(list[0][0]) : "sem uso"} />
        <Stat label="Revisados" value={rows.filter((r) => r.status === "revisado").length} hint="nos últimos 12 meses" />
        <Stat label="Análise com IA" value={aiConfigured() ? "Ligada" : "Desligada"} hint={aiConfigured() ? "chave cadastrada" : "sem custo de IA"} />
      </div>
      {list.length === 0 ? (
        <EmptyState>Nenhum relatório gerado ainda.</EmptyState>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-tint text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">Mês</th>
                <th className="px-3 py-2">Relatórios do projeto</th>
                <th className="px-3 py-2">Análises de ferramenta</th>
                <th className="px-3 py-2">Revisados</th>
                <th className="px-3 py-2">Compartilhados</th>
                <th className="px-3 py-2">Feitos com IA</th>
              </tr>
            </thead>
            <tbody>
              {list.map(([k, m]) => (
                <tr key={k} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold capitalize">{label(k)}</td>
                  <td className="px-3 py-2">{m.projeto}</td>
                  <td className="px-3 py-2">{m.ferramenta}</td>
                  <td className="px-3 py-2">{m.revisados}</td>
                  <td className="px-3 py-2">{m.compartilhados}</td>
                  <td className="px-3 py-2">
                    {m.ia}
                    {m.ia > 0 && <span className="block text-xs text-muted">{(m.tokensIn / 1000).toFixed(0)} mil tokens lidos · {(m.tokensOut / 1000).toFixed(0)} mil escritos</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
