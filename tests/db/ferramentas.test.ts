/** Ferramentas de gestão no banco: quem vê, quem edita, ação ligada à origem. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { consultor: id(), gestor: id(), colab: id(), outro: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };

describe.skipIf(!ADMIN_URL)("banco: ferramentas de gestão", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let swot: string;

  beforeAll(async () => {
    t = await createTestDb("ceo_ferr");
    await t.addUser(u.consultor, "c@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestor, "g@a.test", "Gestor", "client");
    await t.addUser(u.colab, "m@a.test", "Colab", "client");
    await t.addUser(u.outro, "o@b.test", "Outro", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A'),($2,'B','B')`, [c.A, c.B]);
    await t.db.query(`insert into projects (id, company_id, name) values ($1,$2,'PA'),($3,$4,'PB')`, [p.A, c.A, p.B, c.B]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values ($1,$2,'consultant'),($1,$3,'client_manager'),($1,$4,'client_member'),($5,$6,'client_manager')`,
      [p.A, u.consultor, u.gestor, u.colab, p.B, u.outro],
    );
  });

  afterAll(async () => t?.cleanup());

  it("consultoria cria; nasce interna e o cliente não vê", async () => {
    const [row] = await t.as<{ id: string; company_id: string }>(
      u.consultor,
      `insert into strategy_tools (project_id, kind, title, data) values ($1,'swot','SWOT inicial','{"forcas":[]}') returning id, company_id`,
      [p.A],
    );
    swot = row.id;
    expect(row.company_id).toBe(c.A);
    expect(await t.as(u.gestor, "select id from strategy_tools")).toHaveLength(0);
  });

  it("compartilhada: todo o cliente do projeto vê, ninguém de fora, e o cliente não edita", async () => {
    await t.as(u.consultor, "update strategy_tools set visibility = 'client' where id = $1", [swot]);
    expect(await t.as(u.gestor, "select id from strategy_tools")).toHaveLength(1);
    expect(await t.as(u.colab, "select id from strategy_tools")).toHaveLength(1);
    expect(await t.as(u.outro, "select id from strategy_tools")).toHaveLength(0);
    expect(await t.as(u.gestor, "update strategy_tools set title = 'x' where id = $1 returning id", [swot])).toHaveLength(0);
    await expect(t.as(u.gestor, "insert into strategy_tools (project_id, kind, title) values ($1,'gut','x')", [p.A])).rejects.toThrow();
  });

  it("rejeita tipo desconhecido e conteúdo que não é objeto", async () => {
    await expect(t.as(u.consultor, "insert into strategy_tools (project_id, kind, title) values ($1,'tarot','x')", [p.A])).rejects.toThrow();
    await expect(t.as(u.consultor, `insert into strategy_tools (project_id, kind, title, data) values ($1,'gut','x','[]')`, [p.A])).rejects.toThrow();
  });

  it("ação gerada guarda a origem e sobrevive à exclusão da ferramenta", async () => {
    const [a] = await t.as<{ id: string }>(
      u.consultor,
      "insert into action_items (project_id, code, title, source_tool_id) values ($1,'A01','Criar fluxo de caixa',$2) returning id",
      [p.A, swot],
    );
    await t.as(u.consultor, "delete from strategy_tools where id = $1", [swot]);
    const r = await t.db.query("select source_tool_id from action_items where id = $1", [a.id]);
    expect(r.rows[0].source_tool_id).toBeNull();
  });
});
