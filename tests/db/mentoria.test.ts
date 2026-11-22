/** Mentoria no banco: quem vê as avaliações, liberação e biblioteca. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { admin: id(), consultor: id(), mentorado: id(), gestor: id(), outro: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };

describe.skipIf(!ADMIN_URL)("banco: mentoria", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let app: string;

  beforeAll(async () => {
    t = await createTestDb("ceo_ment");
    await t.addUser(u.admin, "a@ceo.test", "Admin", "admin");
    await t.addUser(u.consultor, "c@ceo.test", "Consultora", "consultant");
    await t.addUser(u.mentorado, "m@a.test", "Mentorado", "client");
    await t.addUser(u.gestor, "g@a.test", "Gestor", "client");
    await t.addUser(u.outro, "o@b.test", "Outro", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name, person_kind) values ($1,'Pessoa A','Pessoa A','pf'),($2,'B','B','pj')`, [c.A, c.B]);
    await t.db.query(`insert into projects (id, company_id, name, kind) values ($1,$2,'Mentoria A','Mentoria'),($3,$4,'PB','Mentoria')`, [p.A, c.A, p.B, c.B]);
    await t.db.query(
      `insert into project_members (project_id, user_id, role) values ($1,$2,'consultant'),($1,$3,'client_member'),($1,$4,'client_manager'),($5,$6,'client_manager')`,
      [p.A, u.consultor, u.mentorado, u.gestor, p.B, u.outro],
    );
  });

  afterAll(async () => t?.cleanup());

  it("pessoa física ou jurídica, com padrão pj", async () => {
    const r = await t.db.query("select person_kind from companies order by legal_name");
    expect(r.rows.map((x) => x.person_kind)).toEqual(["pj", "pf"]);
    await expect(t.db.query("update companies set person_kind = 'x' where id = $1", [c.A])).rejects.toThrow();
  });

  it("consultoria cria a aplicação; cliente não cria nem vê antes da liberação", async () => {
    const [row] = await t.as<{ id: string; company_id: string; status: string }>(
      u.consultor,
      `insert into assessment_applications (project_id, instrument, respondent_name, respondent_id, token_hash, expires_at)
       values ($1,'ie_lideranca','Mentorado',$2,'abc', now() + interval '30 days') returning id, company_id, status`,
      [p.A, u.mentorado],
    );
    app = row.id;
    expect(row.company_id).toBe(c.A);
    expect(row.status).toBe("enviado");
    expect(await t.as(u.mentorado, "select id from assessment_applications")).toHaveLength(0);
    expect(await t.as(u.gestor, "select id from assessment_applications")).toHaveLength(0);
    await expect(
      t.as(u.mentorado, "insert into assessment_applications (project_id, instrument, respondent_name) values ($1,'roda_vida','x')", [p.A]),
    ).rejects.toThrow();
    expect(await t.as(null, "select id from assessment_applications").catch(() => [])).toHaveLength(0);
  });

  it("só libera depois de respondida", async () => {
    await expect(t.as(u.consultor, "update assessment_applications set released_at = now() where id = $1", [app])).rejects.toThrow(/liberar_so_respondida/);
  });

  it("liberada: só o mentorado vê; o gestor da empresa e outros clientes não", async () => {
    await t.as(u.consultor, "update assessment_applications set status = 'respondido', submitted_at = now(), scores = '{\"overall\":7}' where id = $1", [app]);
    await t.as(u.consultor, "update assessment_applications set released_at = now(), released_by = $2 where id = $1", [app, u.consultor]);
    expect(await t.as(u.mentorado, "select id from assessment_applications")).toHaveLength(1);
    expect(await t.as(u.gestor, "select id from assessment_applications")).toHaveLength(0);
    expect(await t.as(u.outro, "select id from assessment_applications")).toHaveLength(0);
    expect(await t.as(u.mentorado, "update assessment_applications set mentor_comment = 'x' where id = $1 returning id", [app])).toHaveLength(0);
    expect(await t.as(u.mentorado, "delete from assessment_applications where id = $1 returning id", [app])).toHaveLength(0);
  });

  it("teste externo não tem link e precisa ser do tipo externo", async () => {
    await t.as(u.consultor, `insert into assessment_applications (project_id, instrument, source, title, respondent_name, status, external)
      values ($1,'externo','externo','Teste oficial','Mentorado','respondido','{"principal":{"rotulo":"Índice","valor":47,"maximo":100}}')`, [p.A]);
    await expect(
      t.as(u.consultor, "insert into assessment_applications (project_id, instrument, source, respondent_name, token_hash) values ($1,'externo','externo','x','tok')", [p.A]),
    ).rejects.toThrow(/link_so_para_resposta/);
    await expect(
      t.as(u.consultor, "insert into assessment_applications (project_id, instrument, source, respondent_name) values ($1,'roda_vida','externo','x')", [p.A]),
    ).rejects.toThrow(/externo_coerente/);
  });

  it("auditoria registra marcos, não cada rascunho", async () => {
    const before = await t.db.query("select count(*)::int n from audit_log where entity = 'assessment_applications'");
    await t.as(u.consultor, "update assessment_applications set answers = '{\"ie01\":3}' where id = $1", [app]);
    const after = await t.db.query("select count(*)::int n from audit_log where entity = 'assessment_applications'");
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("biblioteca: todos leem os itens ativos, só admin edita", async () => {
    const lidos = await t.as(u.consultor, "select count(*)::int n from mentoring_library");
    expect((lidos[0] as { n: number }).n).toBeGreaterThan(90);
    expect((await t.as(u.mentorado, "select id from mentoring_library")).length).toBeGreaterThan(90);
    expect(await t.as(u.mentorado, "update mentoring_library set note = 'x' returning id")).toHaveLength(0);
    expect(await t.as(null, "select id from mentoring_library").catch(() => [])).toHaveLength(0);
    expect(await t.as(u.consultor, "update mentoring_library set note = 'x' returning id")).toHaveLength(0);
    const [n] = await t.as<{ id: string }>(u.admin, "insert into mentoring_library (kind, title, tags) values ('livro','Novo livro', array['tema:lideranca']) returning id");
    expect(n.id).toBeTruthy();
    const porDim = await t.as(u.consultor, "select title from mentoring_library where tags && array['ie_lideranca:empatia']");
    expect(porDim.length).toBeGreaterThanOrEqual(3);
  });
});
