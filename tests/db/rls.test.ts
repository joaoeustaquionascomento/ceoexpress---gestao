/**
 * Testes de isolamento e permissões executados contra um PostgreSQL real.
 * As migrações de supabase/migrations são aplicadas num banco novo, sobre um
 * stub mínimo do ambiente Supabase (tests/db/supabase-stub.sql).
 *
 * Requer TEST_DATABASE_URL apontando para um servidor PostgreSQL 15+ com um
 * usuário que possa criar bancos (ex.: postgres://postgres@localhost:5432/postgres).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const ADMIN_URL = process.env.TEST_DATABASE_URL;
const DB_NAME = `ceo_test_${Date.now()}`;

const ids = {
  admin: randomUUID(),
  consultorA: randomUUID(),
  gestorA: randomUUID(),
  colaboradorA: randomUUID(),
  gestorB: randomUUID(),
  semVinculo: randomUUID(),
  empresaA: randomUUID(),
  empresaB: randomUUID(),
  projetoA: randomUUID(),
  projetoB: randomUUID(),
  itemA1: randomUUID(), // atribuído ao colaborador A
  itemA2: randomUUID(), // atribuído ao gestor A
  itemInterno: randomUUID(),
  itemB1: randomUUID(),
};

let db: Client;

function urlFor(name: string) {
  const u = new URL(ADMIN_URL!);
  u.pathname = `/${name}`;
  return u.toString();
}

/** Executa SQL como um usuário autenticado (igual ao Supabase: papel + sub do JWT). */
async function as<T = Record<string, unknown>>(userId: string | null, sql: string, params: unknown[] = []) {
  await db.query("begin");
  try {
    await db.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const res = await db.query(sql, params);
    await db.query("commit");
    return res.rows as T[];
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

describe.skipIf(!ADMIN_URL)("banco: isolamento multiempresa e permissões", () => {
  beforeAll(async () => {
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`create database ${DB_NAME}`);
    await admin.end();

    db = new Client({ connectionString: urlFor(DB_NAME) });
    await db.connect();
    await db.query(readFileSync(join(ROOT, "tests/db/supabase-stub.sql"), "utf8"));
    const dir = join(ROOT, "supabase/migrations");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await db.query(readFileSync(join(dir, f), "utf8"));
    }

    // Base de teste, gravada como superusuário (equivale ao service role).
    const users: [string, string, string, string][] = [
      [ids.admin, "admin@ceoexpress.test", "Direção CEOEXPRESS", "admin"],
      [ids.consultorA, "consultor@ceoexpress.test", "Consultor A", "consultant"],
      [ids.gestorA, "gestor@empresa-a.test", "Gestor A", "client"],
      [ids.colaboradorA, "colab@empresa-a.test", "Colaborador A", "client"],
      [ids.gestorB, "gestor@empresa-b.test", "Gestor B", "client"],
      [ids.semVinculo, "ninguem@exemplo.test", "Sem vínculo", "client"],
    ];
    for (const [id, email, name, role] of users) {
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
      await db.query(
        "insert into profiles (id, email, full_name, platform_role) values ($1, $2, $3, $4)",
        [id, email, name, role],
      );
    }
    await db.query(
      `insert into companies (id, legal_name, trade_name) values
       ($1, 'Empresa A Ltda', 'Empresa A'), ($2, 'Empresa B Ltda', 'Empresa B')`,
      [ids.empresaA, ids.empresaB],
    );
    await db.query(
      `insert into projects (id, company_id, name) values
       ($1, $2, 'Reestruturação A'), ($3, $4, 'Plano de negócios B')`,
      [ids.projetoA, ids.empresaA, ids.projetoB, ids.empresaB],
    );
    await db.query(
      `insert into project_members (project_id, user_id, role) values
       ($1, $2, 'consultant'), ($1, $3, 'client_manager'), ($1, $4, 'client_member'),
       ($5, $6, 'client_manager')`,
      [ids.projetoA, ids.consultorA, ids.gestorA, ids.colaboradorA, ids.projetoB, ids.gestorB],
    );
    await db.query(
      `insert into info_requests (id, project_id, company_id, code, title, category, assigned_to, visibility) values
       ($1, $5, $6, 'A-01', 'Contrato social e alterações', 'Institucional', $7, 'client'),
       ($2, $5, $6, 'A-02', 'Balancetes 2025', 'Financeiro', $8, 'client'),
       ($3, $5, $6, 'A-99', 'Nota interna da consultoria', 'Interno', null, 'internal'),
       ($4, $9, $10, 'B-01', 'Contrato social B', 'Institucional', null, 'client')`,
      [
        ids.itemA1, ids.itemA2, ids.itemInterno, ids.itemB1,
        ids.projetoA, ids.empresaA, ids.colaboradorA, ids.gestorA, ids.projetoB, ids.empresaB,
      ],
    );
  });

  afterAll(async () => {
    await db?.end();
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB_NAME} with (force)`);
    await admin.end();
  });

  it("visitante sem login não lê nenhuma tabela", async () => {
    await expect(as(null, "select * from companies")).rejects.toThrow(/permission denied/);
    await expect(as(null, "select * from info_requests")).rejects.toThrow(/permission denied/);
  });

  it("cliente da empresa B não vê nada da empresa A", async () => {
    const empresas = await as<{ trade_name: string }>(ids.gestorB, "select trade_name from companies");
    expect(empresas.map((e) => e.trade_name)).toEqual(["Empresa B"]);
    const projetos = await as(ids.gestorB, "select id from projects where company_id = $1", [ids.empresaA]);
    expect(projetos).toHaveLength(0);
    const itens = await as<{ code: string }>(ids.gestorB, "select code from info_requests order by code");
    expect(itens.map((i) => i.code)).toEqual(["B-01"]);
  });

  it("cliente B não consegue alterar item da empresa A, mesmo sabendo o id", async () => {
    const r = await as(ids.gestorB, "update info_requests set status = 'enviado' where id = $1 returning id", [
      ids.itemA1,
    ]);
    expect(r).toHaveLength(0);
  });

  it("usuário autenticado sem vínculo não vê empresas nem projetos", async () => {
    expect(await as(ids.semVinculo, "select id from companies")).toHaveLength(0);
    expect(await as(ids.semVinculo, "select id from projects")).toHaveLength(0);
  });

  it("gestor do cliente vê os itens do projeto, mas não notas internas", async () => {
    const itens = await as<{ code: string }>(ids.gestorA, "select code from info_requests order by code");
    expect(itens.map((i) => i.code)).toEqual(["A-01", "A-02"]);
  });

  it("colaborador do cliente vê apenas os itens atribuídos a ele", async () => {
    const itens = await as<{ code: string }>(ids.colaboradorA, "select code from info_requests order by code");
    expect(itens.map((i) => i.code)).toEqual(["A-01"]);
  });

  it("consultor vê todos os itens do seu projeto, inclusive internos, e nada da empresa B", async () => {
    const itens = await as<{ code: string }>(ids.consultorA, "select code from info_requests order by code");
    expect(itens.map((i) => i.code)).toEqual(["A-01", "A-02", "A-99"]);
  });

  it("administrador vê a carteira inteira", async () => {
    const empresas = await as(ids.admin, "select id from companies");
    expect(empresas).toHaveLength(2);
  });

  it("cliente marca um item como Enviado, mas não consegue aprová-lo", async () => {
    const ok = await as<{ status: string }>(
      ids.colaboradorA,
      "update info_requests set status = 'enviado' where id = $1 returning status",
      [ids.itemA1],
    );
    expect(ok[0].status).toBe("enviado");
    await expect(
      as(ids.colaboradorA, "update info_requests set status = 'aprovado' where id = $1", [ids.itemA1]),
    ).rejects.toThrow(/Somente a consultoria/);
  });

  it("cliente não altera a orientação nem o responsável do item", async () => {
    await expect(
      as(ids.gestorA, "update info_requests set title = 'outro', status = 'em_preenchimento' where id = $1", [
        ids.itemA2,
      ]),
    ).rejects.toThrow(/só pode alterar o status/);
  });

  it("consultor aprova e pede complementação", async () => {
    const r = await as<{ status: string }>(
      ids.consultorA,
      "update info_requests set status = 'complementacao_solicitada' where id = $1 returning status",
      [ids.itemA1],
    );
    expect(r[0].status).toBe("complementacao_solicitada");
  });

  it("item gravado com company_id errado é corrigido para a empresa do projeto", async () => {
    const r = await as<{ company_id: string }>(
      ids.consultorA,
      `insert into info_requests (project_id, company_id, code, title, category)
       values ($1, $2, 'A-03', 'Organograma', 'RH') returning company_id`,
      [ids.projetoA, ids.empresaB],
    );
    expect(r[0].company_id).toBe(ids.empresaA);
  });

  it("consultor não cria item em projeto de outro cliente", async () => {
    await expect(
      as(ids.consultorA, "insert into info_requests (project_id, company_id, code, title, category) values ($1, $2, 'X', 'X', 'X')", [
        ids.projetoB,
        ids.empresaB,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("cliente envia documento e versão; outro cliente não os vê", async () => {
    const [doc] = await as<{ id: string }>(
      ids.colaboradorA,
      `insert into documents (project_id, company_id, info_request_id, title, created_by)
       values ($1, $2, $3, 'Contrato social.pdf', $4) returning id`,
      [ids.projetoA, ids.empresaA, ids.itemA1, ids.colaboradorA],
    );
    await as(
      ids.colaboradorA,
      `insert into document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, sha256, uploaded_by)
       values ($1, $2, 1, $3, 'contrato.pdf', 'application/pdf', 1024, 'abc', $4)`,
      [doc.id, ids.empresaA, `${ids.empresaA}/${ids.projetoA}/${doc.id}/v1.pdf`, ids.colaboradorA],
    );
    expect(await as(ids.gestorB, "select id from documents")).toHaveLength(0);
    expect(await as(ids.gestorB, "select id from document_versions")).toHaveLength(0);
    expect(await as(ids.consultorA, "select id from document_versions where document_id = $1", [doc.id])).toHaveLength(1);

    // Exclusão pelo cliente é lógica e o documento continua recuperável pela consultoria.
    await expect(as(ids.gestorA, "select soft_delete_document($1)", [doc.id])).rejects.toThrow(/outra pessoa/);
    await expect(as(ids.gestorB, "select soft_delete_document($1)", [doc.id])).rejects.toThrow(/não encontrado/);
    await as(ids.colaboradorA, "select soft_delete_document($1)", [doc.id]);
    expect(await as(ids.colaboradorA, "select id from documents where id = $1", [doc.id])).toHaveLength(0);
    expect(await as(ids.consultorA, "select id from documents where id = $1", [doc.id])).toHaveLength(1);
    await as(ids.consultorA, "update documents set deleted_at = null where id = $1", [doc.id]);
    expect(await as(ids.colaboradorA, "select id from documents where id = $1", [doc.id])).toHaveLength(1);
  });

  it("cliente não apaga fisicamente documentos", async () => {
    const r = await as(ids.colaboradorA, "delete from documents returning id");
    expect(r).toHaveLength(0);
  });

  it("cliente não se promove a administrador", async () => {
    await expect(
      as(ids.gestorA, "update profiles set platform_role = 'admin' where id = $1", [ids.gestorA]),
    ).rejects.toThrow(/não permitida/);
  });

  it("auditoria registra alterações e não pode ser apagada", async () => {
    const logs = await as<{ action: string }>(
      ids.admin,
      "select action from audit_log where entity = 'info_requests' and entity_id = $1",
      [ids.itemA1],
    );
    expect(logs.length).toBeGreaterThanOrEqual(2);
    await expect(as(ids.admin, "delete from audit_log")).rejects.toThrow(/permission denied/);
    expect(await as(ids.gestorA, "select id from audit_log")).toHaveLength(0);
  });

  describe("convites", () => {
    const token = "convite-teste-" + randomUUID();
    const novo = randomUUID();

    beforeAll(async () => {
      await as(
        ids.consultorA,
        `insert into invitations (email, full_name, platform_role, company_id, company_role, project_id, project_role, token_hash, created_by)
         values ('novo@empresa-a.test', 'Novo', 'client', $1, 'client_member', $2, 'client_member', $3, $4)`,
        [ids.empresaA, ids.projetoA, sha(token), ids.consultorA],
      );
      await db.query("insert into auth.users (id, email) values ($1, 'novo@empresa-a.test')", [novo]);
    });

    it("consultor não convida outro consultor", async () => {
      await expect(
        as(
          ids.consultorA,
          `insert into invitations (email, platform_role, project_id, project_role, company_id, token_hash)
           values ('x@x.test', 'consultant', $1, 'consultant', $2, 'h')`,
          [ids.projetoA, ids.empresaA],
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("prévia pública não revela empresa nem projeto", async () => {
      const [p] = await as<{ valid: boolean; email_hint: string }>(null, "select * from invitation_preview($1)", [token]);
      expect(p.valid).toBe(true);
      expect(p.email_hint).toBe("no***@empresa-a.test");
      const [bad] = await as<{ valid: boolean }>(null, "select * from invitation_preview('nao-existe')");
      expect(bad.valid).toBe(false);
    });

    it("convite não pode ser usado por outra conta", async () => {
      await expect(as(ids.gestorB, "select accept_invitation($1, 'x')", [token])).rejects.toThrow(/outro e-mail/);
    });

    it("aceite cria o vínculo e o convite não pode ser reutilizado", async () => {
      await as(novo, "select accept_invitation($1, 'Novo Colaborador')", [token]);
      const projetos = await as(novo, "select id from projects");
      expect(projetos).toHaveLength(1);
      await expect(as(novo, "select accept_invitation($1, 'x')", [token])).rejects.toThrow(/já utilizado/);
    });

    it("convite expirado é recusado", async () => {
      const t2 = "expirado-" + randomUUID();
      await db.query(
        `insert into invitations (email, platform_role, company_id, company_role, token_hash, expires_at)
         values ('novo@empresa-a.test', 'client', $1, 'client_viewer', $2, now() - interval '1 day')`,
        [ids.empresaA, sha(t2)],
      );
      await expect(as(novo, "select accept_invitation($1, 'x')", [t2])).rejects.toThrow(/expirado/);
    });
  });
});
