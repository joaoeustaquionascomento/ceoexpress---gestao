/**
 * Biblioteca de modelos e exclusão protegida de pedidos e ações (PostgreSQL real).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, ROOT, createTestDb } from "./helpers";

const id = () => randomUUID();
const FIQ = "d7fc4064-e9e4-5317-8f17-825016b0f6da";
const u = { admin: id(), consultor: id(), gestor: id() };
const c = id();
const p = id();

describe.skipIf(!ADMIN_URL)("banco: modelos e exclusão", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(async () => {
    t = await createTestDb("ceo_modelos");
    await t.db.query(readFileSync(join(ROOT, "supabase/seed/fiq-brasil.sql"), "utf8"));
    await t.addUser(u.admin, "admin@ceo.test", "Admin", "admin");
    await t.addUser(u.consultor, "consultor@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestor, "gestor@a.test", "Gestor", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A')`, [c]);
    await t.db.query(`insert into projects (id, company_id, name) values ($1,$2,'Novo')`, [p, c]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values ($1,$2,'consultant'),($1,$3,'client_manager')`,
      [p, u.consultor, u.gestor],
    );
  });

  afterAll(async () => t?.cleanup());

  it("importar um projeto só acrescenta códigos que faltam na biblioteca", async () => {
    const [r] = await t.as<{ requests: number; actions: number }>(u.admin, "select * from import_templates_from_project($1)", [FIQ]);
    // A biblioteca genérica já tem os mesmos códigos: a importação não sobrescreve.
    expect(r.requests).toBe(0);
    expect(r.actions).toBe(0);
    const t1 = await t.db.query("select title from request_templates where code = 'D01'");
    expect(t1.rows[0].title).not.toMatch(/FIQ/);
    await t.db.query("delete from request_templates where code = 'D16'");
    const again = await t.as<{ requests: number }>(u.admin, "select * from import_templates_from_project($1)", [FIQ]);
    expect(again[0].requests).toBe(1);
    const cols = await t.db.query("select column_name from information_schema.columns where table_name = 'request_templates'");
    expect(cols.rows.map((x) => x.column_name)).not.toContain("owner_label");
  });

  it("só a consultoria lê a biblioteca e só o admin altera", async () => {
    expect((await t.as(u.consultor, "select id from request_templates")).length).toBe(16);
    expect(await t.as(u.gestor, "select id from request_templates")).toHaveLength(0);
    await expect(t.as(u.consultor, "select * from import_templates_from_project($1)", [FIQ])).rejects.toThrow(/administrador/);
    const upd = await t.as(u.consultor, "update request_templates set title = 'x' returning id");
    expect(upd).toHaveLength(0);
    await t.as(u.admin, "insert into action_templates (code, title) values ('M99','Modelo novo')");
  });

  it("consultoria cria pedidos a partir dos modelos e exclui pedido sem arquivo", async () => {
    await t.as(
      u.consultor,
      `insert into info_requests (project_id, company_id, code, title, category, checklist, accepted_formats)
       select $1, $2, code, title, category, checklist, accepted_formats from request_templates where code in ('D01','D02')`,
      [p, c],
    );
    const reqs = await t.as<{ id: string; code: string }>(u.gestor, "select id, code from info_requests where project_id = $1 order by code", [p]);
    expect(reqs.map((r) => r.code)).toEqual(["D01", "D02"]);

    await t.as(u.consultor, "insert into comments (target_type, target_id, project_id, company_id, body, author_id) values ('info_request',$1,$2,$3,'oi',$4)", [reqs[1].id, p, c, u.consultor]);
    await expect(t.as(u.gestor, "delete from info_requests where id = $1 returning id", [reqs[1].id])).resolves.toHaveLength(0);
    await t.as(u.consultor, "delete from info_requests where id = $1", [reqs[1].id]);
    const left = await t.db.query("select count(*)::int n from comments where target_id = $1", [reqs[1].id]);
    expect(left.rows[0].n).toBe(0);
  });

  it("não exclui pedido com arquivo enviado", async () => {
    const [r] = await t.as<{ id: string }>(u.gestor, "select id from info_requests where project_id = $1 and code = 'D01'", [p]);
    await t.db.query(
      "insert into documents (project_id, company_id, info_request_id, title) values ($1,$2,$3,'Contrato')",
      [p, c, r.id],
    );
    await expect(t.as(u.consultor, "delete from info_requests where id = $1", [r.id])).rejects.toThrow(/arquivos enviados/);
  });

  it("não exclui ação de que outra depende; exclui a dependente", async () => {
    const [x] = await t.as<{ id: string }>(u.consultor, "insert into action_items (project_id, company_id, code, title) values ($1,$2,'A01','Base') returning id", [p, c]);
    const [y] = await t.as<{ id: string }>(u.consultor, "insert into action_items (project_id, company_id, code, title) values ($1,$2,'A02','Depois') returning id", [p, c]);
    await t.as(u.consultor, "insert into action_dependencies (action_id, depends_on_id) values ($1,$2)", [y.id, x.id]);
    await expect(t.as(u.consultor, "delete from action_items where id = $1", [x.id])).rejects.toThrow(/dependem desta/);
    await expect(t.as(u.gestor, "delete from action_items where id = $1 returning id", [y.id])).resolves.toHaveLength(0);
    await t.as(u.consultor, "delete from action_items where id = $1", [y.id]);
    await t.as(u.consultor, "delete from action_items where id = $1", [x.id]);
  });

  it("excluir o projeto inteiro continua funcionando", async () => {
    await t.db.query("delete from projects where id = $1", [p]);
    const n = await t.db.query("select count(*)::int n from info_requests where project_id = $1", [p]);
    expect(n.rows[0].n).toBe(0);
  });
});

describe.skipIf(!ADMIN_URL)("banco: biblioteca genérica", () => {
  it("os modelos não citam cliente, pessoas nem datas específicas", async () => {
    const t = await createTestDb("ceo_modgen");
    try {
      const r = await t.db.query("select count(*)::int n from request_templates");
      const a = await t.db.query("select count(*)::int n from action_templates");
      expect(r.rows[0].n).toBe(16);
      expect(a.rows[0].n).toBe(30);
      const bad = await t.db.query(
        `select code from (
           select code, concat_ws(' ', title, description, purpose, minimum_content, instructions, checklist::text) txt from request_templates
           union all
           select code, concat_ws(' ', title, rationale, area, how, decision_inputs, completion_criteria, basis) from action_templates
         ) x where txt ~* '(\\mFIQ\\M|izaque|jo[aã]o|ceo ?express|20[0-9]{2}|[0-9]{1,2}/[0-9]{1,2}|cl\\. )'`,
      );
      expect(bad.rows).toEqual([]);
    } finally {
      await t.cleanup();
    }
  });
});
