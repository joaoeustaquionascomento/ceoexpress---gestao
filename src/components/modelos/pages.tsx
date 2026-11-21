import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionTemplateForm, DeleteForm, ImportForm, RequestForm, TemplatePicker } from "@/components/modelos/forms";
import { Alert, BackLink, Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { getProjectAccess } from "@/lib/access";
import { formatChecklist } from "@/lib/checklist";
import { getProjectHeader } from "@/lib/execucao";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type StaffArea = "admin" | "consultor";

async function categoriesOf(projectId?: string) {
  const supabase = await createClient();
  const [a, b] = await Promise.all([
    projectId
      ? supabase.from("info_requests").select("category").eq("project_id", projectId)
      : Promise.resolve({ data: [] as { category: string }[] }),
    supabase.from("request_templates").select("category"),
  ]);
  return [...new Set([...(a.data ?? []), ...(b.data ?? [])].map((r) => r.category))].sort((x, y) => x.localeCompare(y, "pt-BR"));
}

/** Novo pedido ou edição de pedido existente (consultoria). */
export async function RequestEditPage({ area, projectId, requestId }: { area: StaffArea; projectId: string; requestId?: string }) {
  if (!UUID.test(projectId) || (requestId && !UUID.test(requestId))) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access?.staff) notFound();
  const base = `/${area}/projetos/${projectId}`;
  let r: Record<string, unknown> | null = null;
  if (requestId) {
    const supabase = await createClient();
    const { data } = await supabase.from("info_requests").select("*").eq("id", requestId).eq("project_id", projectId).maybeSingle();
    if (!data) notFound();
    r = data;
  }
  const s = (k: string) => (typeof r?.[k] === "string" ? (r[k] as string) : undefined);
  return (
    <>
      <BackLink href={requestId ? `${base}/pedidos/${requestId}` : base} label={requestId ? "Voltar ao pedido" : "Voltar ao projeto"} />
      <PageTitle eyebrow={header.company?.trade_name} title={r ? `Editar ${s("code")}` : "Novo pedido de informação"}>
        {header.name}
      </PageTitle>
      <Card>
        <RequestForm
          mode="projeto"
          area={area}
          projectId={projectId}
          requestId={requestId}
          categories={await categoriesOf(projectId)}
          defaults={r ? {
            code: s("code"), title: s("title"), category: s("category"), stage: s("stage"), description: s("description"),
            purpose: s("purpose"), minimum_content: s("minimum_content"), examples: s("examples"), instructions: s("instructions"),
            owner_label: s("owner_label"), due_on: s("due_on"), checklist: formatChecklist(r.checklist),
            accepted_formats: Array.isArray(r.accepted_formats) ? (r.accepted_formats as string[]).join(", ") : undefined,
            internal: r.visibility === "internal",
          } : {}}
        />
      </Card>
      {requestId && (
        <div className="mt-6">
          <DeleteForm
            kind="pedido"
            label="Excluir este pedido"
            hidden={{ area, projectId, requestId }}
            warning="O pedido e as mensagens dele saem do projeto. Se o cliente já enviou arquivos, a exclusão é bloqueada: nesse caso, marque como &quot;Não aplicável&quot;."
          />
        </div>
      )}
    </>
  );
}

/** Escolher modelos da biblioteca para criar no projeto. */
export async function ApplyTemplatesPage({ area, projectId, novo }: { area: StaffArea; projectId: string; novo?: boolean }) {
  if (!UUID.test(projectId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access?.staff) notFound();
  const supabase = await createClient();
  const [reqTpl, actTpl, reqs, acts] = await Promise.all([
    supabase.from("request_templates").select("id, code, title, category").eq("active", true).order("sort_order").order("code"),
    supabase.from("action_templates").select("id, code, title, area").eq("active", true).order("sort_order").order("code"),
    supabase.from("info_requests").select("code").eq("project_id", projectId),
    supabase.from("action_items").select("code").eq("project_id", projectId),
  ]);
  const reqCodes = new Set((reqs.data ?? []).map((r) => r.code));
  const actCodes = new Set((acts.data ?? []).map((a) => a.code));
  const base = `/${area}/projetos/${projectId}`;
  return (
    <>
      <BackLink href={base} label="Ir para o projeto" />
      <PageTitle eyebrow={header.company?.trade_name} title="Adicionar pedidos e ações dos modelos">
        {header.name}. Marque o que este projeto precisa e clique em criar. Você pode voltar aqui quantas vezes quiser.
      </PageTitle>
      {novo && <div className="mb-4"><Alert tone="ok">Projeto criado. Agora escolha os pedidos e as ações que ele vai ter.</Alert></div>}
      <TemplatePicker
        area={area}
        projectId={projectId}
        requests={(reqTpl.data ?? []).map((t) => ({ id: t.id, code: t.code, title: t.title, group: t.category, exists: reqCodes.has(t.code) }))}
        actions={(actTpl.data ?? []).map((t) => ({ id: t.id, code: t.code, title: t.title, group: t.area ?? "", exists: actCodes.has(t.code) }))}
      />
      {area === "admin" && (
        <p className="mt-6 text-sm text-muted">
          Falta algum modelo? Cadastre na <Link href="/admin/modelos" className="font-semibold text-mauve">Biblioteca de modelos</Link>.
        </p>
      )}
    </>
  );
}

/** Biblioteca de modelos (admin). */
export async function LibraryPage() {
  const supabase = await createClient();
  const [reqTpl, actTpl, projects] = await Promise.all([
    supabase.from("request_templates").select("id, code, title, category, active").order("sort_order").order("code"),
    supabase.from("action_templates").select("id, code, title, area, active").order("sort_order").order("code"),
    supabase.from("projects").select("id, name, company:companies(trade_name)").order("created_at"),
  ]);
  const list = (
    rows: { id: string; code: string; title: string; active: boolean; sub: string | null }[],
    href: (id: string) => string,
  ) =>
    rows.length === 0 ? (
      <EmptyState>Nenhum modelo cadastrado.</EmptyState>
    ) : (
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={href(r.id)} className="flex min-h-11 flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-tint">
              <span className="font-semibold text-ink">{r.code}</span>
              <span className="flex-1">{r.title}{r.sub && <span className="block text-xs text-muted">{r.sub}</span>}</span>
              {!r.active && <Badge>Arquivado</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <>
      <PageTitle eyebrow="Administração" title="Biblioteca de modelos">
        Pedidos de informação e ações prontos para usar em qualquer projeto. Ao criar um projeto, você escolhe quais
        entram. Responsáveis e prazos são definidos em cada projeto.
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-plum">Pedidos de informação</h2>
            <Link href="/admin/modelos/pedidos/novo" className="inline-flex min-h-11 items-center rounded-lg bg-plum px-4 text-sm font-semibold text-white hover:bg-mauve">Novo modelo de pedido</Link>
          </div>
          {list((reqTpl.data ?? []).map((r) => ({ ...r, sub: r.category })), (id) => `/admin/modelos/pedidos/${id}`)}
        </section>
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-plum">Ações do plano</h2>
            <Link href="/admin/modelos/acoes/novo" className="inline-flex min-h-11 items-center rounded-lg bg-plum px-4 text-sm font-semibold text-white hover:bg-mauve">Novo modelo de ação</Link>
          </div>
          {list((actTpl.data ?? []).map((r) => ({ ...r, sub: r.area })), (id) => `/admin/modelos/acoes/${id}`)}
        </section>
      </div>
      <Card className="mt-8 max-w-xl">
        <h2 className="mb-2 font-semibold text-plum">Copiar de um projeto existente</h2>
        <p className="mb-3 text-sm text-muted">
          Copia para a biblioteca os pedidos e as ações (não internas) de um projeto. Códigos que já existem na biblioteca não
          são alterados.
        </p>
        <ImportForm
          projects={((projects.data ?? []) as unknown as { id: string; name: string; company: { trade_name: string } | null }[])
            .map((p) => ({ id: p.id, label: `${p.company?.trade_name ?? ""} · ${p.name}` }))}
        />
      </Card>
    </>
  );
}

export async function RequestTemplateEditPage({ templateId }: { templateId?: string }) {
  if (templateId && !UUID.test(templateId)) notFound();
  let t: Record<string, unknown> | null = null;
  if (templateId) {
    const supabase = await createClient();
    const { data } = await supabase.from("request_templates").select("*").eq("id", templateId).maybeSingle();
    if (!data) notFound();
    t = data;
  }
  const s = (k: string) => (typeof t?.[k] === "string" ? (t[k] as string) : undefined);
  return (
    <>
      <BackLink href="/admin/modelos" label="Voltar à biblioteca" />
      <PageTitle eyebrow="Biblioteca de modelos" title={t ? `Modelo ${s("code")}` : "Novo modelo de pedido"} />
      <Card>
        <RequestForm
          mode="modelo"
          templateId={templateId}
          categories={await categoriesOf()}
          defaults={t ? {
            code: s("code"), title: s("title"), category: s("category"), stage: s("stage"), description: s("description"),
            purpose: s("purpose"), minimum_content: s("minimum_content"), examples: s("examples"), instructions: s("instructions"),
            checklist: formatChecklist(t.checklist),
            accepted_formats: Array.isArray(t.accepted_formats) ? (t.accepted_formats as string[]).join(", ") : undefined,
            active: t.active !== false,
          } : {}}
        />
      </Card>
      {templateId && (
        <div className="mt-6">
          <DeleteForm kind="modelo" label="Excluir este modelo" hidden={{ templateId, tipo: "pedido" }}
            warning="O modelo sai da biblioteca. Os pedidos já criados nos projetos continuam como estão." />
        </div>
      )}
    </>
  );
}

export async function ActionTemplateEditPage({ templateId }: { templateId?: string }) {
  if (templateId && !UUID.test(templateId)) notFound();
  let t: Record<string, unknown> | null = null;
  if (templateId) {
    const supabase = await createClient();
    const { data } = await supabase.from("action_templates").select("*").eq("id", templateId).maybeSingle();
    if (!data) notFound();
    t = data;
  }
  const s = (k: string) => (typeof t?.[k] === "string" ? (t[k] as string) : undefined);
  return (
    <>
      <BackLink href="/admin/modelos" label="Voltar à biblioteca" />
      <PageTitle eyebrow="Biblioteca de modelos" title={t ? `Modelo ${s("code")}` : "Novo modelo de ação"} />
      <Card>
        <ActionTemplateForm
          templateId={templateId}
          defaults={t ? {
            code: s("code"), kind: s("kind"), title: s("title"), rationale: s("rationale"), area: s("area"), how: s("how"),
            priority: s("priority"), decision_inputs: s("decision_inputs"), resources: s("resources"),
            expected_evidence: s("expected_evidence"), completion_criteria: s("completion_criteria"), basis: s("basis"),
            active: t.active !== false,
          } : {}}
        />
      </Card>
      {templateId && (
        <div className="mt-6">
          <DeleteForm kind="modelo" label="Excluir este modelo" hidden={{ templateId, tipo: "acao" }}
            warning="O modelo sai da biblioteca. As ações já criadas nos projetos continuam como estão." />
        </div>
      )}
    </>
  );
}
