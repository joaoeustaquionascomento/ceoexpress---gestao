/** Relatórios com IA no banco: rascunho interno, revisão antes de compartilhar, e troca de códigos. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { consultor: id(), gestor: id(), outro: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };

describe.skipIf(!ADMIN_URL)("banco: relatórios com IA", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let rep: string;
  let tool: string;

  beforeAll(async () => {
    t = await createTestDb("ceo_rel");
    await t.addUser(u.consultor, "c@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestor, "g@a.test", "Gestor", "client");
    await t.addUser(u.outro, "o@b.test", "Outro", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A'),($2,'B','B')`, [c.A, c.B]);
    await t.db.query(`insert into projects (id, company_id, name) values ($1,$2,'PA'),($3,$4,'PB')`, [p.A, c.A, p.B, c.B]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values ($1,$2,'consultant'),($1,$3,'client_manager'),($4,$5,'client_manager')`,
      [p.A, u.consultor, u.gestor, p.B, u.outro],
    );
  });

  afterAll(async () => t?.cleanup());

  it("consultoria grava o rascunho; nasce interno e o cliente não vê", async () => {
    const [row] = await t.as<{ id: string; company_id: string; status: string }>(
      u.consultor,
      `insert into analysis_reports (project_id, title, content) values ($1,'Relatório','{"resumo":"x","secoes":[]}') returning id, company_id, status`,
      [p.A],
    );
    rep = row.id;
    expect(row.company_id).toBe(c.A);
    expect(row.status).toBe("rascunho");
    const [e] = await t.as<{ engine: string }>(u.consultor, "select engine from analysis_reports where id = $1", [row.id]);
    expect(e.engine).toBe("regras");
    await expect(t.as(u.consultor, "update analysis_reports set engine = 'outro' where id = $1", [row.id])).rejects.toThrow();
    expect(await t.as(u.gestor, "select id from analysis_reports")).toHaveLength(0);
    await expect(t.as(u.gestor, "insert into analysis_reports (project_id, title) values ($1,'x')", [p.A])).rejects.toThrow();
  });

  it("não compartilha rascunho sem revisão", async () => {
    await expect(t.as(u.consultor, "update analysis_reports set visibility = 'client' where id = $1", [rep])).rejects.toThrow(/revisar_antes/);
  });

  it("revisado e compartilhado: só o cliente do projeto vê, e não edita", async () => {
    await t.as(u.consultor, "update analysis_reports set status = 'revisado', visibility = 'client', reviewed_by = $2, reviewed_at = now() where id = $1", [rep, u.consultor]);
    expect(await t.as(u.gestor, "select id from analysis_reports")).toHaveLength(1);
    expect(await t.as(u.outro, "select id from analysis_reports")).toHaveLength(0);
    expect(await t.as(u.gestor, "update analysis_reports set title = 'x' where id = $1 returning id", [rep])).toHaveLength(0);
    expect(await t.as(u.gestor, "delete from analysis_reports where id = $1 returning id", [rep])).toHaveLength(0);
  });

  it("análise de ferramenta sai junto quando a ferramenta é excluída", async () => {
    const [tl] = await t.as<{ id: string }>(u.consultor, "insert into strategy_tools (project_id, kind, title) values ($1,'swot','SWOT') returning id", [p.A]);
    tool = tl.id;
    await t.as(u.consultor, "insert into analysis_reports (project_id, tool_id, title) values ($1,$2,'Análise')", [p.A, tool]);
    await t.as(u.consultor, "delete from strategy_tools where id = $1", [tool]);
    expect(await t.as(u.consultor, "select id from analysis_reports where tool_id = $1", [tool])).toHaveLength(0);
    expect(await t.as(u.consultor, "select id from analysis_reports")).toHaveLength(1);
  });

  it("troca D01 → PI-01 e A01 → AP-01 nos projetos, sem mexer em outros códigos", async () => {
    await t.db.query(
      `insert into info_requests (project_id, company_id, code, title, category) values ($1,$2,'D01','a','x'),($1,$2,'D12','b','x'),($1,$2,'X9','c','x')`,
      [p.B, c.B],
    );
    await t.db.query(
      `insert into action_items (project_id, company_id, code, title) values ($1,$2,'A07','a'),($1,$2,'AP-08','b'),($1,$2,null,'c')`,
      [p.B, c.B],
    );
    await t.renameCodes();
    await t.renameCodes(); // pode rodar de novo sem efeito
    const r = await t.db.query("select code from info_requests where project_id = $1 order by code", [p.B]);
    expect(r.rows.map((x) => x.code)).toEqual(["PI-01", "PI-12", "X9"]);
    const a = await t.db.query("select code from action_items where project_id = $1 order by code nulls last", [p.B]);
    expect(a.rows.map((x) => x.code)).toEqual(["AP-07", "AP-08", null]);
  });
});
