/**
 * Fase 2: fluxo de documentos no banco (PostgreSQL real): envio pelo cliente,
 * regras do armazenamento de arquivos, análise pela consultoria, comentários
 * e notificações automáticas.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { consultor: id(), gestorA: id(), colabA: id(), colabA2: id(), gestorB: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };
const req = { A1: id(), A2: id(), B1: id() };

describe.skipIf(!ADMIN_URL)("banco: fluxo de documentos (fase 2)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let docId: string;

  beforeAll(async () => {
    t = await createTestDb("ceo_docs");
    await t.addUser(u.consultor, "consultor@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestorA, "gestor@a.test", "Gestor A", "client");
    await t.addUser(u.colabA, "colab@a.test", "Colaborador A", "client");
    await t.addUser(u.colabA2, "colab2@a.test", "Colaborador A2", "client");
    await t.addUser(u.gestorB, "gestor@b.test", "Gestor B", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A'),($2,'B','B')`, [c.A, c.B]);
    await t.db.query(`insert into projects (id, company_id, name) values ($1,$2,'PA'),($3,$4,'PB')`, [p.A, c.A, p.B, c.B]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values
       ($1,$2,'consultant'),($1,$3,'client_manager'),($1,$4,'client_member'),($1,$5,'client_member'),($6,$7,'client_manager')`,
      [p.A, u.consultor, u.gestorA, u.colabA, u.colabA2, p.B, u.gestorB],
    );
    await t.db.query(
      `insert into info_requests (id, project_id, company_id, code, title, category, assigned_to) values
       ($1,$4,$5,'D01','Contrato','Inst',$6),($2,$4,$5,'D02','Saldos','Fin',null),($3,$7,$8,'B01','Contrato B','Inst',null)`,
      [req.A1, req.A2, req.B1, p.A, c.A, u.colabA, p.B, c.B],
    );
  });

  afterAll(async () => t?.cleanup());

  it("colaborador cria o documento do pedido atribuído a ele e envia o arquivo ao armazenamento", async () => {
    const [d] = await t.as<{ id: string }>(
      u.colabA,
      `insert into documents (project_id, company_id, info_request_id, title, created_by)
       values ($1,$2,$3,'contrato.pdf',$4) returning id`,
      [p.A, c.A, req.A1, u.colabA],
    );
    docId = d.id;
    await t.as(u.colabA, "insert into storage.objects (bucket_id, name) values ('documentos', $1)", [
      `${c.A}/${p.A}/${docId}/v1-contrato.pdf`,
    ]);
    await t.as(
      u.colabA,
      `insert into document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, sha256, uploaded_by, period, source, comment)
       values ($1,$2,1,$3,'contrato.pdf','application/pdf',2048,'h1',$4,'2026','Jurídico','Via assinada')`,
      [docId, c.A, `${c.A}/${p.A}/${docId}/v1-contrato.pdf`, u.colabA],
    );
    const [r] = await t.as<{ status: string }>(
      u.colabA,
      "update info_requests set status = 'enviado' where id = $1 returning status",
      [req.A1],
    );
    expect(r.status).toBe("enviado");
  });

  it("colaborador não envia documento para pedido que não é dele", async () => {
    await expect(
      t.as(
        u.colabA2,
        `insert into documents (project_id, company_id, info_request_id, title, created_by) values ($1,$2,$3,'x',$4)`,
        [p.A, c.A, req.A1, u.colabA2],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("ninguém grava arquivo no armazenamento sem um documento seu correspondente", async () => {
    await expect(
      t.as(u.gestorB, "insert into storage.objects (bucket_id, name) values ('documentos', $1)", [
        `${c.A}/${p.A}/${docId}/v9-invasao.pdf`,
      ]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.as(u.colabA, "insert into storage.objects (bucket_id, name) values ('documentos', $1)", [
        `${c.B}/${p.A}/${docId}/v2-pasta-errada.pdf`,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("arquivo só pode ser baixado por quem vê a versão", async () => {
    const path = `${c.A}/${p.A}/${docId}/v1-contrato.pdf`;
    const sel = "select name from storage.objects where name = $1";
    expect(await t.as(u.colabA, sel, [path])).toHaveLength(1);
    expect(await t.as(u.consultor, sel, [path])).toHaveLength(1);
    expect(await t.as(u.gestorA, sel, [path])).toHaveLength(1);
    expect(await t.as(u.colabA2, sel, [path])).toHaveLength(0);
    expect(await t.as(u.gestorB, sel, [path])).toHaveLength(0);
  });

  it("o envio notifica a consultoria, e não o próprio cliente", async () => {
    const n = await t.as<{ title: string; link: string }>(u.consultor, "select title, link from notifications");
    expect(n).toHaveLength(1);
    expect(n[0].title).toContain("Colaborador A enviou D01");
    expect(n[0].link).toBe(`/consultor/projetos/${p.A}/pedidos/${req.A1}`);
    expect(await t.as(u.colabA, "select id from notifications")).toHaveLength(0);
  });

  it("substituição gera nova versão e mantém a anterior", async () => {
    await t.as(u.colabA, "insert into storage.objects (bucket_id, name) values ('documentos', $1)", [
      `${c.A}/${p.A}/${docId}/v2-contrato.pdf`,
    ]);
    await t.as(
      u.colabA,
      `insert into document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, sha256, uploaded_by)
       values ($1,$2,2,$3,'contrato-v2.pdf','application/pdf',4096,'h2',$4)`,
      [docId, c.A, `${c.A}/${p.A}/${docId}/v2-contrato.pdf`, u.colabA],
    );
    const v = await t.as<{ version: number }>(u.consultor, "select version from document_versions where document_id = $1 order by version", [docId]);
    expect(v.map((x) => x.version)).toEqual([1, 2]);
    // O mesmo número de versão não pode ser gravado duas vezes.
    await expect(
      t.as(
        u.colabA,
        `insert into document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, sha256, uploaded_by)
         values ($1,$2,2,'x','x','application/pdf',1,'h',$3)`,
        [docId, c.A, u.colabA],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("consultoria pede complementação com comentário e o cliente é avisado", async () => {
    await t.as(u.consultor, "update info_requests set status = 'em_analise' where id = $1", [req.A1]);
    await t.as(
      u.consultor,
      `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
       values ($1,$2,'info_request',$3,'Falta o aditivo de 2025.','client',$4)`,
      [p.A, c.A, req.A1, u.consultor],
    );
    await t.as(u.consultor, "update info_requests set status = 'complementacao_solicitada' where id = $1", [req.A1]);
    // Mensagem e mudança de status viram um único aviso.
    const nColab = await t.as<{ kind: string; title: string }>(u.colabA, "select kind, title from notifications");
    expect(nColab).toHaveLength(1);
    expect(nColab[0].kind).toBe("status_pedido");
    expect(nColab[0].title).toContain("com mensagem da consultoria");
    const nGestor = await t.as<{ kind: string }>(u.gestorA, "select kind from notifications");
    expect(nGestor.map((n) => n.kind)).toContain("status_pedido");
    expect(await t.as(u.colabA2, "select id from notifications")).toHaveLength(0);
    expect(await t.as(u.gestorB, "select id from notifications")).toHaveLength(0);
  });

  it("nota interna da consultoria não aparece para o cliente", async () => {
    await t.as(
      u.consultor,
      `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
       values ($1,$2,'info_request',$3,'Conferir com o jurídico antes de aprovar.','internal',$4)`,
      [p.A, c.A, req.A1, u.consultor],
    );
    const vis = await t.as<{ body: string }>(u.colabA, "select body from comments where target_id = $1", [req.A1]);
    expect(vis.map((x) => x.body)).toEqual(["Falta o aditivo de 2025."]);
    expect(await t.as(u.colabA2, "select id from comments")).toHaveLength(0);
    await expect(
      t.as(
        u.colabA,
        `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
         values ($1,$2,'info_request',$3,'x','internal',$4)`,
        [p.A, c.A, req.A1, u.colabA],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("cliente não comenta em pedido de outra empresa nem em pedido que não vê", async () => {
    await expect(
      t.as(
        u.gestorB,
        `insert into comments (project_id, company_id, target_type, target_id, body, author_id)
         values ($1,$2,'info_request',$3,'x',$4)`,
        [p.B, c.B, req.A1, u.gestorB],
      ),
    ).rejects.toThrow(/não pertence/);
    await expect(
      t.as(
        u.colabA2,
        `insert into comments (project_id, company_id, target_type, target_id, body, author_id)
         values ($1,$2,'info_request',$3,'x',$4)`,
        [p.A, c.A, req.A1, u.colabA2],
      ),
    ).rejects.toThrow(/não pertence/);
  });

  it("cliente reenvia após complementação, consultoria aprova e só ela restaura excluídos", async () => {
    await t.as(u.colabA, "update info_requests set status = 'enviado' where id = $1", [req.A1]);
    await t.as(u.consultor, "update info_requests set status = 'aprovado' where id = $1", [req.A1]);
    await expect(
      t.as(u.colabA, "update info_requests set status = 'enviado' where id = $1", [req.A1]),
    ).rejects.toThrow(/não pode ser alterado/);

    await t.as(u.colabA, "select soft_delete_document($1)", [docId]);
    await expect(t.as(u.colabA, "select restore_document($1)", [docId])).rejects.toThrow(/não encontrado/);
    await t.as(u.consultor, "select restore_document($1)", [docId]);
    expect(await t.as(u.colabA, "select id from documents where id = $1", [docId])).toHaveLength(1);
  });

  it("cada um só vê e marca como lidas as próprias notificações", async () => {
    const r = await t.as(u.gestorA, "update notifications set read_at = now() where user_id = $1 returning id", [u.colabA]);
    expect(r).toHaveLength(0);
    const own = await t.as(u.colabA, "update notifications set read_at = now() returning id");
    expect(own.length).toBeGreaterThan(0);
  });
});
