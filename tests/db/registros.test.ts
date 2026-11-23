/**
 * Registro de decisões ampliado: propostas para avaliar, alinhamentos e
 * próximos passos que viram ações do plano, com o lado responsável.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { consultor: id(), gestorA: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };
const d = { prop: id(), alin: id(), interno: id(), outro: id() };

describe.skipIf(!ADMIN_URL)("banco: registros (propostas e alinhamentos)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(async () => {
    t = await createTestDb("ceo_reg");
    await t.addUser(u.consultor, "consultor@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestorA, "gestor@a.test", "Gestor A", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A'),($2,'B','B')`, [c.A, c.B]);
    await t.db.query(`insert into projects (id, company_id, name) values ($1,$2,'PA'),($3,$4,'PB')`, [p.A, c.A, p.B, c.B]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values ($1,$2,'consultant'),($1,$3,'client_manager')`,
      [p.A, u.consultor, u.gestorA],
    );
  });

  afterAll(async () => t?.cleanup());

  it("consultoria registra proposta e alinhamento com os campos novos", async () => {
    await t.as(
      u.consultor,
      `insert into decisions (id, project_id, kind, code, summary, topic, details, link_url, source, cost_note, review_on, status, visibility)
       values ($1,$3,'proposta','RG-01','Proposta de comunicação','Marketing','Texto recebido','https://exemplo.com','Fornecedor X','R$ 1.000/mês','2027-01-15','em_avaliacao','client'),
              ($2,$3,'alinhamento','RG-02','Alinhamento do conselho','Vendas','O que alinhamos...',null,null,null,null,'aprovada','client'),
              ($4,$3,'decisao','RG-03','Contratar armazenamento','Tecnologia',null,null,null,null,null,'adiada','internal')`,
      [d.prop, d.alin, p.A, d.interno],
    );
    await t.db.query(`insert into decisions (id, project_id, summary) values ($1,$2,'Outro projeto')`, [d.outro, p.B]);
    const rows = await t.as<{ kind: string; company_id: string }>(u.consultor, "select kind, company_id from decisions order by code");
    expect(rows.map((r) => r.kind)).toEqual(["proposta", "alinhamento", "decisao"]);
    expect(rows.every((r) => r.company_id === c.A)).toBe(true);
  });

  it("recusa tipo, situação ou link inválidos", async () => {
    await expect(
      t.as(u.consultor, `insert into decisions (project_id, kind, summary) values ($1,'qualquer','X')`, [p.A]),
    ).rejects.toThrow();
    await expect(
      t.as(u.consultor, `insert into decisions (project_id, status, summary) values ($1,'talvez','X')`, [p.A]),
    ).rejects.toThrow();
    await expect(
      t.as(u.consultor, `insert into decisions (project_id, summary, link_url) values ($1,'X','javascript:alert(1)')`, [p.A]),
    ).rejects.toThrow();
  });

  it("próximos passos viram ações ligadas ao registro, com o lado", async () => {
    await t.as(
      u.consultor,
      `insert into action_items (project_id, code, title, decision_id, side) values
       ($1,'AP-01','Enviar a apresentação',$2,'consultoria'),
       ($1,'AP-02','Treinar a equipe',$2,'cliente')`,
      [p.A, d.alin],
    );
    const steps = await t.as<{ side: string }>(u.gestorA, "select side from action_items where decision_id = $1 order by code", [d.alin]);
    expect(steps.map((s) => s.side)).toEqual(["consultoria", "cliente"]);
    await expect(
      t.as(u.consultor, `insert into action_items (project_id, title, side) values ($1,'X','fornecedor')`, [p.A]),
    ).rejects.toThrow();
  });

  it("ação não pode apontar para registro de outro projeto", async () => {
    await expect(
      t.as(u.consultor, `insert into action_items (project_id, title, decision_id) values ($1,'X',$2)`, [p.A, d.outro]),
    ).rejects.toThrow(/mesmo projeto/);
  });

  it("cliente só vê registros compartilhados e não edita", async () => {
    const seen = await t.as<{ code: string }>(u.gestorA, "select code from decisions order by code");
    expect(seen.map((s) => s.code)).toEqual(["RG-01", "RG-02"]);
    await expect(
      t.as(u.gestorA, `insert into decisions (project_id, summary) values ($1,'X')`, [p.A]),
    ).rejects.toThrow();
  });

  it("apagar o registro mantém as ações, só desfaz o vínculo", async () => {
    await t.as(u.consultor, "delete from decisions where id = $1", [d.alin]);
    const left = await t.as<{ decision_id: string | null }>(u.consultor, "select decision_id from action_items where code in ('AP-01','AP-02')");
    expect(left).toHaveLength(2);
    expect(left.every((r) => r.decision_id === null)).toBe(true);
  });
});
