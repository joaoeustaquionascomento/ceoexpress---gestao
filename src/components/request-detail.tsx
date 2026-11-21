import { Badge, Card, EmptyState } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { AssignForm, CommentForm, DocumentActions, ReviewForm } from "@/components/request-forms";
import { REQUEST_STATUS, clientCanSetStatus, formatDate, type RequestStatus } from "@/lib/status";
import { formatBytes } from "@/lib/upload";
import { formatDateTime, type getRequestDetail } from "@/lib/queries";
import type { ProjectAccess } from "@/lib/access";

type Detail = NonNullable<Awaited<ReturnType<typeof getRequestDetail>>>;
const toneOf = (s: RequestStatus) => {
  const t = REQUEST_STATUS[s].tone;
  return t === "ok" ? "ok" : t === "warn" ? "warn" : t === "info" ? "info" : "neutral";
};

export function RequestDetail({ data, access }: { data: Detail; access: ProjectAccess }) {
  const { request: r, documents, comments, members } = data;
  const status = r.status as RequestStatus;
  const clientCanSend = access.canUpload && (access.staff || clientCanSetStatus(status, "enviado"));
  const clientPeople = members
    .filter((m) => m.role !== "consultant")
    .map((m) => ({ id: m.user_id, name: m.profile?.full_name ?? "Usuário" }));
  const assignee = members.find((m) => m.user_id === r.assigned_to)?.profile?.full_name;
  const visibleDocs = documents.filter((d) => !d.deleted_at || access.staff);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone={toneOf(status)}>{REQUEST_STATUS[status].label}</Badge>
            <span className="text-sm text-muted">Prazo {formatDate(r.due_on)}</span>
            <span className="text-sm text-muted">· Responsável: {assignee ?? r.owner_label ?? "a definir"}</span>
          </div>
          <dl className="grid gap-4 text-sm leading-relaxed sm:grid-cols-2">
            {r.description && (<div><dt className="font-semibold text-plum">O que enviar</dt><dd>{r.description}</dd></div>)}
            {r.purpose && (<div><dt className="font-semibold text-plum">Finalidade</dt><dd>{r.purpose}</dd></div>)}
            {r.minimum_content && (<div><dt className="font-semibold text-plum">Conteúdo mínimo</dt><dd>{r.minimum_content}</dd></div>)}
            {r.examples && (<div><dt className="font-semibold text-plum">Exemplos</dt><dd>{r.examples}</dd></div>)}
          </dl>
          {r.checklist.length > 0 && (
            <ol className="mt-5 space-y-2 text-sm">
              {r.checklist.map((c, i) => (
                <li key={i} className="rounded-lg bg-canvas p-3">
                  <p className="font-semibold">{i + 1}. {c.item}</p>
                  {c.instrucao && <p className="mt-1 text-muted">{c.instrucao}</p>}
                </li>
              ))}
            </ol>
          )}
          {r.instructions && (
            <details className="mt-4 text-sm">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-mauve">Passo a passo para envio</summary>
              <p className="whitespace-pre-line text-muted">{r.instructions}</p>
            </details>
          )}
          <p className="mt-4 text-xs text-muted">
            &quot;Enviado&quot; significa que o arquivo foi recebido. A validação é feita pela consultoria, que aprova ou pede complementação.
          </p>
        </Card>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-plum">Arquivos enviados</h2>
          {visibleDocs.length === 0 ? (
            <EmptyState>Nenhum arquivo enviado ainda.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {visibleDocs.map((d) => {
                const [latest, ...older] = d.versions;
                return (
                  <li key={d.id} className={`rounded-xl border bg-surface p-4 ${d.deleted_at ? "border-dashed border-bad opacity-80" : "border-line"}`}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <a href={`/arquivos/${latest.id}`} className="break-words font-semibold text-plum underline-offset-2 hover:underline">
                          {latest.file_name}
                        </a>
                        <p className="text-xs text-muted">
                          Versão {latest.version} · {formatBytes(latest.size_bytes)} · {latest.uploader?.full_name ?? "—"} · {formatDateTime(latest.created_at)}
                        </p>
                        {(latest.period || latest.source) && (
                          <p className="text-xs text-muted">
                            {latest.period && <>Período: {latest.period}</>}{latest.period && latest.source && " · "}{latest.source && <>Fonte: {latest.source}</>}
                          </p>
                        )}
                        {latest.comment && <p className="mt-1 text-sm">{latest.comment}</p>}
                        {latest.checklist_items.length > 0 && (
                          <p className="mt-1 text-xs text-muted">Atende: {latest.checklist_items.join("; ")}</p>
                        )}
                      </div>
                      {d.deleted_at && <Badge tone="bad">Excluído</Badge>}
                    </div>
                    {older.length > 0 && (
                      <details className="mt-2 text-sm">
                        <summary className="min-h-10 cursor-pointer py-1 font-semibold text-mauve">Histórico ({older.length} versão(ões) anterior(es))</summary>
                        <ul className="mt-1 space-y-1">
                          {older.map((v) => (
                            <li key={v.id}>
                              <a href={`/arquivos/${v.id}`} className="text-plum hover:underline">v{v.version} · {v.file_name}</a>
                              <span className="text-xs text-muted"> · {v.uploader?.full_name} · {formatDateTime(v.created_at)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <div className="mt-3">
                      <DocumentActions
                        documentId={d.id}
                        requestId={r.id}
                        projectId={r.project_id}
                        deleted={Boolean(d.deleted_at)}
                        canDelete={access.staff || (d.created_by === access.userId && clientCanSend)}
                        canRestore={access.staff}
                        canReplace={access.staff || (d.created_by === access.userId && clientCanSend)}
                        accepted={r.accepted_formats}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-plum">Mensagens</h2>
          {comments.length === 0 ? (
            <EmptyState>Nenhuma mensagem.</EmptyState>
          ) : (
            <ul className="mb-4 space-y-2">
              {comments.map((c) => (
                <li key={c.id} className={`rounded-xl p-3 text-sm ${c.visibility === "internal" ? "border border-dashed border-warn bg-warn-bg" : "border border-line bg-surface"}`}>
                  <p className="text-xs text-muted">
                    <strong className="text-ink">{c.author?.full_name}</strong> · {formatDateTime(c.created_at)}
                    {c.visibility === "internal" && " · nota interna"}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {(access.staff || access.role !== "client_viewer") && (
            <Card><CommentForm requestId={r.id} staff={access.staff} /></Card>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        {clientCanSend ? (
          <Card>
            <h2 className="mb-3 font-semibold text-plum">{access.staff ? "Anexar arquivo" : "Enviar arquivo"}</h2>
            <UploadForm requestId={r.id} accepted={r.accepted_formats} checklist={r.checklist.map((c) => c.item)} />
          </Card>
        ) : (
          !access.staff && (
            <Card>
              <p className="text-sm text-muted">
                {access.role === "client_viewer"
                  ? "Seu perfil é de consulta. Para enviar arquivos, fale com o gestor da sua empresa."
                  : "Este pedido está em análise ou concluído. Se precisar alterar algo, envie uma mensagem à consultoria."}
              </p>
            </Card>
          )
        )}
        {access.staff && (
          <>
            <Card>
              <h2 className="mb-3 font-semibold text-plum">Análise da consultoria</h2>
              <ReviewForm requestId={r.id} current={status} />
            </Card>
            <Card>
              <AssignForm requestId={r.id} current={r.assigned_to} people={clientPeople} />
            </Card>
          </>
        )}
      </aside>
    </div>
  );
}
