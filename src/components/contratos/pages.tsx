import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CancelButton,
  ContractForm,
  DeleteContractButton,
  DeleteTemplateForm,
  GenerateButton,
  LinkCompanyForm,
  SentButton,
  SettingsForm,
  SignedUpload,
  TemplateForm,
  VisibleButton,
  type CompanyOption,
} from "@/components/contratos/forms";
import { ContractPreview } from "@/components/contratos/preview";
import { Alert, BackLink, Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import {
  aplicarSugestoes,
  camposUsados,
  CONTRACT_STATUS,
  defaultData,
  documentoContratante,
  montarTexto,
  nomeContratante,
  pendenciasParaGerar,
  valoresDosCampos,
  type ContractStatus,
} from "@/lib/contratos/dados";
import { getContract, getSettings, hojeSP } from "@/lib/contratos/servidor";
import { formatDate } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE = "/admin/contratos";
const linkButton = "inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-mauve hover:bg-tint";
const linkPrimary = "inline-flex min-h-11 items-center rounded-lg bg-plum px-4 text-sm font-semibold text-white hover:bg-mauve";

function StatusBadge({ status }: { status: ContractStatus }) {
  const s = CONTRACT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

async function companies(): Promise<CompanyOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("id, legal_name, trade_name, cnpj").eq("status", "ativo").order("trade_name");
  return (data ?? []) as CompanyOption[];
}

async function templates(activeOnly: boolean) {
  const supabase = await createClient();
  let q = supabase.from("contract_templates").select("id, title, description, active, body, defaults").order("sort_order").order("title");
  if (activeOnly) q = q.eq("active", true);
  const { data } = await q;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------
export async function ContractsListPage() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("contracts").select("id, code, title, party_name, status, updated_at, signed_at").order("created_at", { ascending: false }),
    getSettings(),
  ]);
  const rows = (data ?? []) as { id: string; code: string; title: string; party_name: string; status: ContractStatus; updated_at: string; signed_at: string | null }[];
  return (
    <>
      <PageTitle eyebrow="Administração" title="Contratos">
        Gere contratos a partir dos seus modelos preenchendo só os dados do cliente, o escopo e os valores. O app monta o PDF;
        o cliente assina no gov.br e você sobe o PDF assinado aqui.
      </PageTitle>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`${BASE}/novo`} className={linkPrimary}>Novo contrato</Link>
        <Link href={`${BASE}/modelos`} className={linkButton}>Modelos de contrato</Link>
        <Link href={`${BASE}/configuracoes`} className={linkButton}>Dados da contratada</Link>
      </div>
      {!settings.provider_qualification && (
        <div className="mb-6">
          <Alert tone="warn">
            Antes do primeiro contrato, preencha os <Link href={`${BASE}/configuracoes`} className="font-semibold underline">dados da contratada</Link> (sua empresa). Eles entram em todos os contratos.
          </Alert>
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState>Nenhum contrato ainda. Clique em &quot;Novo contrato&quot; para começar.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`${BASE}/${r.id}`} className="flex min-h-11 flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-tint">
                <span className="font-semibold text-ink">{r.code}</span>
                <span className="min-w-0 flex-1">
                  {r.party_name}
                  <span className="block text-xs text-muted">{r.title} · atualizado em {formatDate(r.updated_at)}</span>
                </span>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Novo / editar
// ---------------------------------------------------------------------------
export async function ContractEditPage({ contractId, modelo }: { contractId?: string; modelo?: string }) {
  if (contractId && !UUID.test(contractId)) notFound();
  const [settings, tpls, comps] = await Promise.all([getSettings(), templates(true), companies()]);
  const c = contractId ? await getContract(contractId) : null;
  if (contractId && !c) notFound();
  if (c && (c.status === "assinado" || c.status === "cancelado")) notFound();
  // Contrato novo: o modelo escolhido traz os textos sugeridos.
  const chosen = c ? null : tpls.find((t) => t.id === modelo) ?? tpls[0];
  const data = c?.data ?? aplicarSugestoes(defaultData(settings, hojeSP()), chosen?.defaults);
  return (
    <>
      <BackLink href={c ? `${BASE}/${c.id}` : BASE} label={c ? "Voltar ao contrato" : "Voltar aos contratos"} />
      <PageTitle eyebrow="Contratos" title={c ? `Editar ${c.code}` : "Novo contrato"}>
        Preencha o que muda neste contrato. O resto vem do modelo. Você pode salvar incompleto e terminar depois.
      </PageTitle>
      {tpls.length === 0 ? (
        <Alert tone="warn">Nenhum modelo ativo. Crie um em <Link href={`${BASE}/modelos`} className="font-semibold underline">Modelos de contrato</Link>.</Alert>
      ) : (
        <Card>
          <ContractForm
            key={chosen?.id ?? c?.id}
            contractId={c?.id}
            data={data}
            templateId={c?.template_id ?? chosen?.id}
            companyId={c?.company_id}
            templates={tpls.map((t) => ({ id: t.id, title: t.title, description: t.description, uses: [...camposUsados(t.body + "\n" + Object.values((t.defaults ?? {}) as Record<string, unknown>).filter((v) => typeof v === "string").join("\n"))] }))}
            companies={comps}
            wasGenerated={!!c && c.status !== "rascunho"}
          />
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------
function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 font-semibold text-plum">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${done ? "bg-ok-bg text-ok" : "bg-tint text-plum"}`} aria-hidden>
          {done ? "✓" : n}
        </span>
        {title}
      </p>
      <div className="mt-3 space-y-3 text-sm">{children}</div>
    </li>
  );
}

export async function ContractPage({ contractId }: { contractId: string }) {
  if (!UUID.test(contractId)) notFound();
  const c = await getContract(contractId);
  if (!c) notFound();
  const supabase = await createClient();
  const [settings, tpl, comps] = await Promise.all([
    getSettings(),
    c.template_id ? supabase.from("contract_templates").select("title, body").eq("id", c.template_id).maybeSingle() : Promise.resolve({ data: null }),
    companies(),
  ]);
  const sig = {
    contratada: { nome: settings.provider_name, documento: settings.provider_document },
    contratante: { nome: nomeContratante(c.data), documento: documentoContratante(c.data) },
    testemunhas: c.data.testemunhas,
  };
  const draft = c.status === "rascunho";
  const live = tpl.data ? montarTexto(tpl.data.body, valoresDosCampos(c.data, settings)) : null;
  const texto = !draft && c.body ? c.body : live?.texto ?? "";
  const pend = draft && tpl.data ? pendenciasParaGerar(c.data, settings, tpl.data.body) : [];
  const generated = !!c.pdf_path && c.status !== "rascunho";
  const editable = c.status !== "assinado" && c.status !== "cancelado";

  return (
    <>
      <BackLink href={BASE} label="Voltar aos contratos" />
      <PageTitle eyebrow={`Contrato ${c.code}`} title={c.party_name || c.title}>
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <span>{c.title}</span>
          {tpl.data && <span className="text-xs">· modelo: {tpl.data.title}</span>}
        </span>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          {draft && pend.length > 0 && (
            <div className="mb-4">
              <Alert tone="warn">
                Faltam informações para gerar o PDF:
                <ul className="mt-2 list-disc pl-5">{pend.map((p) => <li key={p}>{p}</li>)}</ul>
              </Alert>
            </div>
          )}
          {!tpl.data && draft ? (
            <Alert tone="bad">O modelo deste contrato não existe mais. Clique em &quot;Editar dados&quot; e escolha outro.</Alert>
          ) : (
            <ContractPreview texto={texto} sig={sig} />
          )}
        </div>

        <ol className="order-1 space-y-3 lg:order-2">
          <Step n={1} title="Dados do contrato" done={!draft || pend.length === 0}>
            {editable ? (
              <Link href={`${BASE}/${c.id}/editar`} className={linkButton}>Editar dados</Link>
            ) : (
              <p className="text-muted">Contrato {c.status === "assinado" ? "assinado" : "cancelado"}: os dados não mudam mais.</p>
            )}
          </Step>

          <Step n={2} title="Gerar o PDF" done={generated}>
            {generated && (
              <>
                <a href={`/contratos/${c.id}/arquivo/gerado`} className={linkPrimary}>Baixar PDF para assinatura</a>
                <p className="break-all text-xs text-muted">Gerado em {formatDate(c.generated_at!)} · SHA-256 {c.pdf_sha256}</p>
              </>
            )}
            {(c.status === "rascunho" || c.status === "gerado") && <GenerateButton contractId={c.id} again={generated} />}
          </Step>

          <Step n={3} title="Assinatura no gov.br" done={c.status === "assinado"}>
            {c.status === "assinado" ? (
              <>
                <a href={`/contratos/${c.id}/arquivo/assinado`} className={linkPrimary}>Baixar PDF assinado</a>
                <p className="break-all text-xs text-muted">
                  Recebido em {formatDate(c.signed_at!)} · {c.signed_file_name} · SHA-256 {c.signed_sha256}
                </p>
                <p className="text-xs text-muted">
                  Para conferir as assinaturas, envie o PDF em <a className="font-semibold underline" href="https://validar.iti.gov.br" target="_blank" rel="noreferrer">validar.iti.gov.br</a>.
                </p>
              </>
            ) : generated && c.status !== "cancelado" ? (
              <>
                <details className="rounded-lg bg-canvas p-3">
                  <summary className="cursor-pointer font-semibold text-mauve">Como assinar pelo gov.br</summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                    <li>Baixe o PDF acima e envie ao cliente (e-mail ou WhatsApp).</li>
                    <li>O cliente acessa <a className="font-semibold underline" href="https://assinador.iti.br" target="_blank" rel="noreferrer">assinador.iti.br</a>, entra com a conta gov.br (nível prata ou ouro), envia o PDF, escolhe onde a assinatura aparece, assina e baixa o arquivo assinado.</li>
                    <li>Ele devolve esse PDF assinado para você.</li>
                    <li>Você faz o mesmo com o arquivo que ele devolveu, para as duas assinaturas ficarem no mesmo PDF.</li>
                    <li>Suba aqui o PDF final, com as duas assinaturas.</li>
                  </ol>
                </details>
                {c.status === "gerado" && <SentButton contractId={c.id} />}
                {c.sent_at && <p className="text-xs text-muted">Enviado ao cliente em {formatDate(c.sent_at)}.</p>}
                <SignedUpload contractId={c.id} />
              </>
            ) : (
              <p className="text-muted">Disponível depois de gerar o PDF.</p>
            )}
          </Step>

          {c.status === "assinado" && (
            <Step n={4} title="Área do cliente" done={c.client_visible}>
              <LinkCompanyForm contractId={c.id} companyId={c.company_id} companies={comps} />
              {c.company_id && <VisibleButton contractId={c.id} visible={c.client_visible} />}
              <p className="text-xs text-muted">
                {c.client_visible ? "Os usuários dessa empresa veem e baixam o PDF assinado em Contratos." : "Só você vê este contrato até liberar."}
              </p>
            </Step>
          )}

          {editable && (
            <li className="flex flex-wrap gap-2 pt-2">
              {c.status !== "rascunho" && <CancelButton contractId={c.id} />}
              <DeleteContractButton contractId={c.id} />
            </li>
          )}
          {c.status === "cancelado" && (
            <li className="pt-2"><DeleteContractButton contractId={c.id} /></li>
          )}
        </ol>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Modelos e configurações
// ---------------------------------------------------------------------------
export async function TemplatesPage() {
  const rows = await templates(false);
  return (
    <>
      <BackLink href={BASE} label="Voltar aos contratos" />
      <PageTitle eyebrow="Contratos" title="Modelos de contrato">
        Suas minutas-padrão. As partes que mudam em cada contrato são campos entre chaves, como {"{{contratante_qualificacao}}"} ou {"{{valor_total}}"}.
      </PageTitle>
      <div className="mb-4">
        <Link href={`${BASE}/modelos/novo`} className={linkPrimary}>Novo modelo</Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState>Nenhum modelo cadastrado.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`${BASE}/modelos/${t.id}`} className="flex min-h-11 flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-tint">
                <span className="flex-1 font-semibold text-ink">{t.title}{t.description && <span className="block text-xs font-normal text-muted">{t.description}</span>}</span>
                {!t.active && <Badge>Arquivado</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export async function TemplateEditPage({ templateId, copyFrom }: { templateId?: string; copyFrom?: string }) {
  if (templateId && !UUID.test(templateId)) notFound();
  const supabase = await createClient();
  let t: { title: string; description: string | null; body: string; active: boolean; defaults: Record<string, unknown> | null } | null = null;
  const sourceId = templateId ?? (copyFrom && UUID.test(copyFrom) ? copyFrom : undefined);
  if (sourceId) {
    const { data } = await supabase.from("contract_templates").select("title, description, body, active, defaults").eq("id", sourceId).maybeSingle();
    if (!data && templateId) notFound();
    t = data;
  }
  const copying = !templateId && !!t;
  return (
    <>
      <BackLink href={`${BASE}/modelos`} label="Voltar aos modelos" />
      <PageTitle eyebrow="Modelos de contrato" title={templateId ? t!.title : copying ? "Novo modelo (cópia)" : "Novo modelo"} />
      {templateId && (
        <div className="mb-4">
          <Link href={`${BASE}/modelos/novo?copiar=${templateId}`} className={linkButton}>Duplicar este modelo</Link>
        </div>
      )}
      <Card>
        <TemplateForm
          templateId={templateId}
          defaults={t ? { title: copying ? `${t.title} (cópia)` : t.title, description: t.description ?? "", body: t.body, active: t.active, sugestoes: t.defaults ?? {} } : {}}
        />
      </Card>
      {templateId && <div className="mt-6"><DeleteTemplateForm templateId={templateId} /></div>}
    </>
  );
}

export async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <BackLink href={BASE} label="Voltar aos contratos" />
      <PageTitle eyebrow="Contratos" title="Dados da contratada">
        Os dados da sua empresa, que entram em todos os contratos como &quot;Contratada&quot;.
      </PageTitle>
      <Card><SettingsForm defaults={settings} /></Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Área do cliente
// ---------------------------------------------------------------------------
export async function ClientContractsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("id, code, title, signed_at")
    .eq("status", "assinado")
    .eq("client_visible", true)
    .order("signed_at", { ascending: false });
  const rows = data ?? [];
  return (
    <>
      <PageTitle eyebrow="Área do Cliente" title="Contratos">Seus contratos assinados com a consultoria.</PageTitle>
      {rows.length === 0 ? (
        <EmptyState>Nenhum contrato disponível.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex min-h-11 flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-semibold text-ink">{r.code}</span>
              <span className="flex-1">{r.title}<span className="block text-xs text-muted">Assinado em {r.signed_at ? formatDate(r.signed_at) : "—"}</span></span>
              <a href={`/contratos/${r.id}/arquivo/assinado`} className={linkButton}>Baixar PDF</a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
