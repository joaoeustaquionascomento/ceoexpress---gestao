/**
 * Fase 3: execução no banco (PostgreSQL real): dependências, histórico de
 * status, quem pode atualizar ações, comentários e avisos.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { consultor: id(), gestorA: id(), colabA: id(), colabA2: id(), gestorB: id() };
const c = { A: id(), B: id() };
const p = { A: id(), B: id() };
const a = { prep: id(), main: id(), internal: id(), other: id(), b: id() };

describe.skipIf(!ADMIN_URL)("banco: execução (fase 3)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(async () => {
    t = await createTestDb("ceo_exec");
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
  });

  afterAll(async () => t?.cleanup());

  it("consultoria cria ações com as 7 perguntas e o executor é avisado", async () => {
    await t.as(
      u.consultor,
      `insert into action_items (id, project_id, company_id, code, title, rationale, executor_id, approver_id,
                                 decision_inputs, due_on, expected_evidence, created_by)
       values ($1,$2,$3,'A01','Levantar saldos','Base do fluxo de caixa',$4,$5,'Extratos','2027-01-31','Planilha conciliada',$5),
              ($6,$2,$3,'A02','Fechar fluxo de caixa','Decidir investimentos',$4,$5,'Saldos','2027-02-28','Fluxo aprovado',$5),
              ($7,$2,$3,'A03','Avaliar consultoria jurídica','Interno',null,null,null,null,null,$5),
              ($8,$2,$3,'A04','Treinar equipe','Capacitação',$9,null,null,null,null,$5)`,
      [a.prep, p.A, c.A, u.colabA, u.consultor, a.main, a.internal, a.other, u.colabA2],
    );
    await t.as(u.consultor, "update action_items set visibility = 'internal' where id = $1", [a.internal]);
    await t.db.query(
      `insert into action_items (id, project_id, company_id, code, title) values ($1,$2,$3,'B01','Ação B')`,
      [a.b, p.B, c.B],
    );
    const n = await t.as<{ kind: string; link: string }>(u.colabA, "select kind, link from notifications");
    expect(n).toHaveLength(2);
    expect(n.every((x) => x.kind === "acao_atribuida" && x.link.startsWith("/cliente/projetos/"))).toBe(true);
  });

  it("executor precisa ser do projeto", async () => {
    await expect(
      t.as(u.consultor, "update action_items set executor_id = $1 where id = $2", [u.gestorB, a.main]),
    ).rejects.toThrow(/participar do projeto/);
  });

  it("dependências: mesmo projeto, sem ciclo, e só a consultoria cadastra", async () => {
    await t.as(u.consultor, "insert into action_dependencies (action_id, depends_on_id) values ($1,$2)", [a.main, a.prep]);
    await expect(
      t.as(u.consultor, "insert into action_dependencies (action_id, depends_on_id) values ($1,$2)", [a.prep, a.main]),
    ).rejects.toThrow(/ciclo/);
    await expect(
      t.as(u.consultor, "insert into action_dependencies (action_id, depends_on_id) values ($1,$2)", [a.main, a.b]),
    ).rejects.toThrow();
    await expect(
      t.as(u.gestorA, "insert into action_dependencies (action_id, depends_on_id) values ($1,$2)", [a.other, a.prep]),
    ).rejects.toThrow();
    const deps = await t.as(u.colabA, "select * from action_dependencies");
    expect(deps).toHaveLength(1);
  });

  it("não conclui antes das dependências; executor atualiza e a consultoria é avisada", async () => {
    await expect(
      t.as(u.colabA, "select set_action_status($1, 'concluida', null)", [a.main]),
    ).rejects.toThrow(/ainda não concluídas/);
    await t.as(u.colabA, "select set_action_status($1, 'em_andamento', 'Pedi os extratos ao banco')", [a.prep]);
    await t.as(u.colabA, "select set_action_status($1, 'concluida', 'Planilha enviada')", [a.prep]);
    await t.as(u.colabA, "select set_action_status($1, 'concluida', null)", [a.main]);

    const hist = await t.as<{ status_from: string; status_to: string; note: string | null; author_id: string }>(
      u.gestorA,
      "select status_from, status_to, note, author_id from action_updates where action_id = $1 order by created_at",
      [a.prep],
    );
    expect(hist.map((h) => h.status_to)).toEqual(["em_andamento", "concluida"]);
    expect(hist[0].note).toBe("Pedi os extratos ao banco");
    expect(hist[0].author_id).toBe(u.colabA);

    const n = await t.as<{ kind: string; link: string }>(u.consultor, "select kind, link from notifications where kind = 'status_acao'");
    expect(n).toHaveLength(3);
    expect(n[0].link.startsWith("/consultor/projetos/")).toBe(true);
  });

  it("colaborador que não é executor não atualiza; ninguém do cliente cancela", async () => {
    await expect(t.as(u.colabA, "select set_action_status($1, 'em_andamento', null)", [a.other])).rejects.toThrow(
      /gestor do cliente ou o executor/,
    );
    await expect(t.as(u.gestorA, "select set_action_status($1, 'cancelada', null)", [a.other])).rejects.toThrow(
      /Só a consultoria/,
    );
    await t.as(u.gestorA, "select set_action_status($1, 'bloqueada', 'Aguardando orçamento')", [a.other]);
    // Atualização direta na tabela continua proibida para o cliente.
    const r = await t.as(u.gestorA, "update action_items set status = 'concluida' where id = $1 returning id", [a.other]);
    expect(r).toHaveLength(0);
    await expect(t.as(u.gestorB, "select set_action_status($1, 'em_andamento', null)", [a.other])).rejects.toThrow(
      /não encontrada/,
    );
  });

  it("ação interna: cliente não vê, não atualiza e não comenta; consultoria muda status e o executor é avisado", async () => {
    expect(await t.as(u.gestorA, "select id from action_items where id = $1", [a.internal])).toHaveLength(0);
    await expect(t.as(u.gestorA, "select set_action_status($1, 'em_andamento', null)", [a.internal])).rejects.toThrow(
      /não encontrada/,
    );
    await expect(
      t.as(
        u.gestorA,
        `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
         values ($1,$2,'action_item',$3,'Oi','client',$4)`,
        [p.A, c.A, a.internal, u.gestorA],
      ),
    ).rejects.toThrow(/não pertence/);
    await expect(
      t.as(
        u.consultor,
        `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
         values ($1,$2,'action_item',$3,'Oi','client',$4)`,
        [p.A, c.A, a.internal, u.consultor],
      ),
    ).rejects.toThrow(/precisa ser interno/);

    await t.as(u.consultor, "select set_action_status($1, 'em_andamento', 'Começamos')", [a.other]);
    const n = await t.as<{ kind: string }>(u.colabA2, "select kind from notifications where kind = 'status_acao'");
    expect(n).toHaveLength(1);
  });

  it("comentário na ação avisa a outra parte e só aparece para quem vê a ação", async () => {
    await t.as(
      u.gestorA,
      `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
       values ($1,$2,'action_item',$3,'Orçamento chega sexta','client',$4)`,
      [p.A, c.A, a.other, u.gestorA],
    );
    await t.as(
      u.consultor,
      `insert into comments (project_id, company_id, target_type, target_id, body, visibility, author_id)
       values ($1,$2,'action_item',$3,'Nota interna','internal',$4)`,
      [p.A, c.A, a.internal, u.consultor],
    );
    const nc = await t.as<{ title: string }>(u.consultor, "select title from notifications where kind = 'comentario'");
    expect(nc.some((x) => x.title.includes("A04"))).toBe(true);
    expect(await t.as(u.gestorA, "select id from comments where target_id = $1", [a.internal])).toHaveLength(0);
    expect(await t.as(u.colabA, "select id from comments where target_id = $1", [a.other])).toHaveLength(1);
    expect(await t.as(u.gestorB, "select id from comments")).toHaveLength(0);
  });
});
