import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentForm, DeleteMinutesForm, MinutesEditor, MinutesStarter, SendItemsForm } from "@/components/atas/client";
import { PrintButton } from "@/components/relatorios/client";
import { BackLink, Badge, Card, Logo, PageTitle } from "@/components/ui";
import { getProjectAccess } from "@/lib/access";
import { normalizeMinutes, type MinutesContent } from "@/lib/atas/conteudo";
import { getProjectHeader, type Area } from "@/lib/execucao";
import { formatDateTime } from "@/lib/queries";
import { aiConfigured } from "@/lib/relatorios/ia";
import { formatDate } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const ENGINE: Record<string, string> = {
  manual: "Escrita à mão",
  regras: "Montada da transcrição",
  importada: "Ata trazida de fora",
  ia: "Rascunho feito com IA",
};

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => {
        const lines = p.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l)))
          return (
            <ul key={i} className="mb-3 list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{l.replace(/^\s*[-•]\s+/, "")}</li>)}
            </ul>
          );
        return <p key={i} className="mb-3 whitespace-pre-line last:mb-0">{p}</p>;
      })}
    </>
  );
}

/** Corpo da ata, igual na tela e na impressão. */
export function MinutesBody({ c }: { c: MinutesContent }) {
  const h2 = "mb-2 border-b border-line pb-1 text-lg font-semibold text-plum print:break-after-avoid";
  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      {(c.participantes.length > 0 || c.pauta.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {c.participantes.length > 0 && (
            <section>
              <h2 className={h2}>Participantes</h2>
              <ul className="list-disc space-y-1 pl-5">{c.participantes.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </section>
          )}
          {c.pauta.length > 0 && (
            <section>
              <h2 className={h2}>Pauta</h2>
              <ol className="list-decimal space-y-1 pl-5">{c.pauta.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </section>
          )}
        </div>
      )}
      {c.resumo && (
        <section className="rounded-xl bg-tint p-4 print:break-inside-avoid">
          <h2 className="mb-2 text-lg font-semibold text-plum">Resumo</h2>
          <Paragraphs text={c.resumo} />
        </section>
      )}
      {c.assuntos.some((a) => a.texto) && (
        <section>
          <h2 className={h2}>Assuntos tratados</h2>
          <div className="space-y-4">
            {c.assuntos.filter((a) => a.texto).map((a, i) => (
              <div key={i}>
                {a.titulo && <h3 className="mb-1 font-semibold">{a.titulo}</h3>}
                <Paragraphs text={a.texto} />
              </div>
            ))}
          </div>
        </section>
      )}
      {c.decisoes.length > 0 && (
        <section className="print:break-inside-avoid">
          <h2 className={h2}>Decisões</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {c.decisoes.map((d, i) => <li key={i}>{d.texto}{d.responsavel ? <span className="text-muted"> ({d.responsavel})</span> : null}</li>)}
          </ol>
        </section>
      )}
      {c.encaminhamentos.length > 0 && (
        <section>
          <h2 className={h2}>Encaminhamentos</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr><th className="py-2 pr-3">O quê</th><th className="py-2 pr-3">Responsável</th><th className="py-2">Prazo</th></tr>
              </thead>
              <tbody>
                {c.encaminhamentos.map((t, i) => (
                  <tr key={i} className="border-t border-line align-top print:break-inside-avoid">
                    <td className="py-2 pr-3">{t.oque}</td>
                    <td className="py-2 pr-3">{t.responsavel || "A definir"}</td>
                    <td className="py-2 whitespace-nowrap">{t.prazo ? formatDate(t.prazo) : "Sem prazo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {c.pendencias.length > 0 && (
        <section className="print:break-inside-avoid">
          <h2 className={h2}>Pendências e pontos em aberto</h2>
          <ul className="list-disc space-y-1 pl-5">{c.pendencias.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

type MinutesRow = {
  id: string;
  content: unknown;
  engine: string;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  attachment_document_id: string | null;
};

export async function MinutesPage({ area, projectId, meetingId, edit }: { area: Area; projectId: string; meetingId: string; edit: boolean }) {
  if (!UUID.test(projectId) || !UUID.test(meetingId)) notFound();
  const [header, access] = await Promise.all([getProjectHeader(projectId), getProjectAccess(projectId)]);
  if (!header || !access) notFound();
  const supabase = await createClient();
  const [{ data: meeting }, { data: row }] = await Promise.all([
    supabase.from("meetings").select("id, title, scheduled_on, start_time, visibility").eq("id", meetingId).eq("project_id", projectId).maybeSingle(),
    supabase
      .from("meeting_minutes")
      .select("id, content, engine, status, created_at, updated_at, reviewed_at, attachment_document_id")
      .eq("meeting_id", meetingId)
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);
  if (!meeting) notFound();
  const minutes = row as MinutesRow | null;
  const staff = access.staff && area !== "cliente";
  const base = `/${area}/projetos/${projectId}`;
  const pageUrl = `${base}/agenda/${meetingId}/ata`;
  const c = normalizeMinutes(minutes?.content);
  const reviewed = minutes?.status === "revisada";

  let attachment: { versionId: string; fileName: string } | null = null;
  if (minutes?.attachment_document_id) {
    const { data: v } = await supabase
      .from("document_versions")
      .select("id, file_name")
      .eq("document_id", minutes.attachment_document_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (v) attachment = { versionId: v.id, fileName: v.file_name };
  }

  const when = `${formatDate(meeting.scheduled_on)}${meeting.start_time ? ` · ${String(meeting.start_time).slice(0, 5)}` : ""}`;

  if (!minutes || (!staff && !reviewed)) {
    if (!staff) notFound();
    return (
      <>
        <BackLink href={`${base}/agenda`} label="Voltar à agenda" />
        <PageTitle eyebrow={`Ata · ${when}`} title={meeting.title}>
          {header.company?.trade_name ? `${header.company.trade_name} · ` : ""}{header.name}
        </PageTitle>
        <Card className="max-w-3xl">
          <MinutesStarter area={area as "admin" | "consultor"} projectId={projectId} meetingId={meetingId} aiOn={aiConfigured()} hasMinutes={false} />
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <BackLink href={`${base}/agenda`} label="Voltar à agenda" />
      </div>
      {staff && (
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <Badge tone={reviewed ? "ok" : "warn"}>{reviewed ? "Revisada" : "Rascunho"}</Badge>
          <Badge tone="neutral">{ENGINE[minutes.engine] ?? minutes.engine}</Badge>
          {meeting.visibility === "internal" && <Badge tone="warn">Encontro interno</Badge>}
          {edit ? (
            <Link href={pageUrl} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">Ver como fica</Link>
          ) : (
            <Link href={`${pageUrl}?editar=1`} className="inline-flex min-h-11 items-center rounded-lg bg-plum px-4 text-sm font-semibold text-white hover:bg-mauve">Revisar e editar</Link>
          )}
          {!edit && <PrintButton />}
        </div>
      )}
      {!staff && <div className="mb-4 print:hidden"><PrintButton /></div>}

      {staff && !reviewed && !edit && (
        <p className="mb-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn print:hidden">
          Rascunho: o cliente ainda não vê esta ata. Confira e complete, depois marque como revisada.
        </p>
      )}

      {edit && staff ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Card>
            <h1 className="mb-1 text-xl font-semibold text-plum">{meeting.title}</h1>
            <p className="mb-4 text-sm text-muted">Ata · {when}</p>
            <MinutesEditor projectId={projectId} meetingId={meetingId} content={c} reviewed={reviewed} internalMeeting={meeting.visibility === "internal"} />
          </Card>
          <aside className="space-y-4">
            <Card>
              <h2 className="mb-2 font-semibold text-plum">Como revisar</h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Corte frases que não são decisões ou tarefas de verdade e reescreva as que ficaram confusas.</li>
                <li>Confira responsáveis e prazos de cada encaminhamento.</li>
                <li>Escreva o resumo em poucas linhas.</li>
                <li>Marque como revisada e salve. Depois leve encaminhamentos ao plano e decisões ao registro.</li>
              </ol>
            </Card>
            <details className="rounded-xl border border-line bg-surface p-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-mauve">Refazer a partir de outra transcrição ou ata</summary>
              <div className="pt-2">
                <MinutesStarter area={area as "admin" | "consultor"} projectId={projectId} meetingId={meetingId} aiOn={aiConfigured()} hasMinutes />
              </div>
            </details>
            <DeleteMinutesForm area={area} projectId={projectId} meetingId={meetingId} />
          </aside>
        </div>
      ) : (
        <div className={staff ? "grid gap-6 xl:grid-cols-[1fr_320px]" : ""}>
          <article className="rounded-xl border border-line bg-surface p-5 sm:p-8 print:border-0 print:p-0">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose">Ata de reunião · {when}</p>
                <h1 className="mt-1 text-2xl font-semibold text-plum">{meeting.title}</h1>
                <p className="mt-1 text-sm text-muted">{header.company?.trade_name ? `${header.company.trade_name} · ` : ""}{header.name}</p>
              </div>
              <Logo width={120} />
            </header>
            <MinutesBody c={c} />
            {attachment && (
              <p className="mt-6 print:hidden">
                <a href={`/arquivos/${attachment.versionId}`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold text-mauve hover:bg-tint">
                  Baixar arquivo da ata ({attachment.fileName})
                </a>
              </p>
            )}
            <footer className="mt-8 border-t border-line pt-3 text-xs text-muted">
              CEOEXPRESS | Gestão Estratégica · {minutes.reviewed_at ? `Revisada em ${formatDateTime(minutes.reviewed_at)}` : `Atualizada em ${formatDateTime(minutes.updated_at)}`}
            </footer>
          </article>

          {staff && (
            <aside className="space-y-4 print:hidden">
              <Card>
                <h2 className="mb-1 font-semibold text-plum">Levar ao plano de ação</h2>
                <p className="mb-3 text-sm text-muted">Cada encaminhamento marcado vira uma ação (AP-..) com responsável e prazo.</p>
                {c.encaminhamentos.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum encaminhamento na ata.</p>
                ) : (
                  <SendItemsForm kind="plano" projectId={projectId} meetingId={meetingId}
                    items={c.encaminhamentos.map((t) => ({ label: `${t.oque}${t.responsavel ? ` · ${t.responsavel}` : ""}${t.prazo ? ` · ${formatDate(t.prazo)}` : ""}`, done: !!t.action_id }))} />
                )}
              </Card>
              <Card>
                <h2 className="mb-1 font-semibold text-plum">Levar ao registro de decisões</h2>
                {c.decisoes.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma decisão na ata.</p>
                ) : (
                  <SendItemsForm kind="decisoes" projectId={projectId} meetingId={meetingId} items={c.decisoes.map((d) => ({ label: d.texto, done: !!d.decision_id }))} />
                )}
              </Card>
              <Card>
                <h2 className="mb-1 font-semibold text-plum">Arquivo da ata</h2>
                <p className="mb-3 text-sm text-muted">PDF ou Word feito fora do sistema. O cliente baixa depois que a ata estiver revisada.</p>
                <AttachmentForm projectId={projectId} meetingId={meetingId} hasFile={!!attachment} />
              </Card>
            </aside>
          )}
        </div>
      )}
    </>
  );
}
