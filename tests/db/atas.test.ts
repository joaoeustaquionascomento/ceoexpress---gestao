/**
 * Atas de reunião no banco (PostgreSQL real): rascunho só para a consultoria,
 * cliente vê a ata revisada de encontro não interno, e a ata precisa ser do
 * mesmo projeto do encontro.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { consultor: id(), gestorA: id(), gestorB: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };
const m = { aberto: id(), interno: id(), outro: id() };

describe.skipIf(!ADMIN_URL)("banco: atas de reunião", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(async () => {
    t = await createTestDb("ceo_atas");
    await t.addUser(u.consultor, "consultor@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestorA, "gestor@a.test", "Gestor A", "client");
    await t.addUser(u.gestorB, "gestor@b.test", "Gestor B", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A'),($2,'B','B')`, [c.A, c.B]);
    await t.db.query(`insert into projects (id, company_id, name) values ($1,$2,'PA'),($3,$4,'PB')`, [p.A, c.A, p.B, c.B]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values ($1,$2,'consultant'),($1,$3,'client_manager'),($4,$5,'client_manager')`,
      [p.A, u.consultor, u.gestorA, p.B, u.gestorB],
    );
    await t.db.query(
      `insert into meetings (id, project_id, company_id, scheduled_on, title, visibility) values
       ($1,$4,$5,'2026-11-23','Alinhamento','client'),($2,$4,$5,'2026-11-24','Interna','internal'),($3,$6,$7,'2026-11-23','Outro','client')`,
      [m.aberto, m.interno, m.outro, p.A, c.A, p.B, c.B],
    );
  });

  afterAll(async () => t?.cleanup());

  it("consultoria cria atas em rascunho; empresa vem do projeto", async () => {
    await t.as(
      u.consultor,
      `insert into meeting_minutes (project_id, meeting_id, content, engine) values
       ($1,$2,'{"resumo":"ok"}','regras'),($1,$3,'{"resumo":"interno"}','importada')`,
      [p.A, m.aberto, m.interno],
    );
    const rows = await t.as<{ company_id: string; status: string }>(u.consultor, "select company_id, status from meeting_minutes");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.company_id === c.A && r.status === "rascunho")).toBe(true);
  });

  it("uma ata por encontro", async () => {
    await expect(
      t.as(u.consultor, `insert into meeting_minutes (project_id, meeting_id) values ($1,$2)`, [p.A, m.aberto]),
    ).rejects.toThrow(/duplicate|unique/);
  });

  it("o encontro precisa ser do mesmo projeto", async () => {
    await expect(t.db.query(`insert into meeting_minutes (project_id, meeting_id) values ($1,$2)`, [p.A, m.outro])).rejects.toThrow(
      /não pertence a este projeto/,
    );
  });

  it("cliente não vê rascunho; vê a revisada; nunca a de encontro interno", async () => {
    expect(await t.as(u.gestorA, "select id from meeting_minutes")).toHaveLength(0);
    await t.as(u.consultor, "update meeting_minutes set status = 'revisada'");
    const seen = await t.as<{ meeting_id: string }>(u.gestorA, "select meeting_id from meeting_minutes");
    expect(seen.map((r) => r.meeting_id)).toEqual([m.aberto]);
    expect(await t.as(u.gestorB, "select id from meeting_minutes")).toHaveLength(0);
  });

  it("cliente não altera nem cria atas", async () => {
    const upd = await t.as(u.gestorA, "update meeting_minutes set content = '{}' returning id");
    expect(upd).toHaveLength(0);
    await expect(
      t.as(u.gestorB, `insert into meeting_minutes (project_id, meeting_id) values ($1,$2)`, [p.B, m.outro]),
    ).rejects.toThrow(/row-level security/);
  });

  it("fica registrada na auditoria", async () => {
    const { rows } = await t.db.query("select count(*)::int n from audit_log where entity = 'meeting_minutes'");
    expect(rows[0].n).toBeGreaterThanOrEqual(2);
  });
});
