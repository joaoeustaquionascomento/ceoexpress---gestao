/** Contratos no banco: só o administrador mexe; contrato assinado fica travado; cliente só vê o liberado. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_URL, createTestDb } from "./helpers";

const id = () => randomUUID();
const u = { admin: id(), consultor: id(), gestor: id(), outro: id() };
const c = { A: id(), B: id() };
const SHA = "a".repeat(64);

describe.skipIf(!ADMIN_URL)("banco: contratos", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let ct: string;

  beforeAll(async () => {
    t = await createTestDb("ceo_ct");
    await t.addUser(u.admin, "a@ceo.test", "Admin", "admin");
    await t.addUser(u.consultor, "c@ceo.test", "Consultora", "consultant");
    await t.addUser(u.gestor, "g@a.test", "Gestor", "client");
    await t.addUser(u.outro, "o@b.test", "Outro", "client");
    await t.db.query(`insert into companies (id, legal_name, trade_name) values ($1,'A','A'),($2,'B','B')`, [c.A, c.B]);
    await t.db.query(`insert into memberships (user_id, company_id, role) values ($1,$2,'client_manager'),($3,$4,'client_manager')`, [u.gestor, c.A, u.outro, c.B]);
  });

  afterAll(async () => t?.cleanup());

  it("traz os três modelos da CEOEXPRESS (o genérico saiu) e a contratada padrão", async () => {
    const tpl = await t.as<{ title: string; defaults: Record<string, unknown> }>(u.admin, "select title, defaults from contract_templates where active order by sort_order");
    expect(tpl.map((r) => r.title)).toEqual([
      "Consultoria em gestão estratégica e mentoria executiva",
      "Assessoria estratégica com honorários mensais",
      "Mentoria estratégica",
    ]);
    expect(tpl[0].defaults.testemunhas).toBe(true);
    const [s] = await t.as<{ provider_name: string }>(u.admin, "select provider_name from contract_settings");
    expect(s.provider_name).toBe("J Nascimento Serviços Ltda.");
  });

  it("só o administrador vê e grava modelos, configurações e contratos", async () => {
    for (const who of [u.consultor, u.gestor]) {
      expect(await t.as(who, "select id from contract_templates")).toHaveLength(0);
      expect(await t.as(who, "select id from contract_settings")).toHaveLength(0);
      await expect(t.as(who, "insert into contracts (code, title) values ('X-1','Contrato X')")).rejects.toThrow();
    }
    const [row] = await t.as<{ id: string; status: string }>(
      u.admin,
      `insert into contracts (code, title, party_name, company_id, data) values ('CT-2026-001','Consultoria – A','A',$1,'{"tipo":"pj"}') returning id, status`,
      [c.A],
    );
    ct = row.id;
    expect(row.status).toBe("rascunho");
    expect(await t.as(u.consultor, "select id from contracts")).toHaveLength(0);
  });

  it("não marca como gerado sem PDF, nem assinado sem arquivo", async () => {
    await expect(t.as(u.admin, "update contracts set status = 'gerado' where id = $1", [ct])).rejects.toThrow(/gerado_tem_pdf/);
    await t.as(u.admin, "update contracts set status = 'gerado', body = 'texto', pdf_path = $2, pdf_sha256 = $3 where id = $1", [ct, `${ct}/a.pdf`, SHA]);
    await expect(t.as(u.admin, "update contracts set status = 'assinado' where id = $1", [ct])).rejects.toThrow(/assinado_tem_arquivo/);
    await expect(t.as(u.admin, "update contracts set client_visible = true where id = $1", [ct])).rejects.toThrow(/cliente_so_assinado/);
  });

  it("assinado: não muda, não é excluído; só libera para o cliente da empresa", async () => {
    await t.as(u.admin, "update contracts set status = 'assinado', signed_path = $2, signed_sha256 = $3, signed_at = now() where id = $1", [ct, `${ct}/assinado-1.pdf`, SHA]);
    await expect(t.as(u.admin, "update contracts set title = 'Outro' where id = $1", [ct])).rejects.toThrow(/não pode ser alterado/);
    await expect(t.as(u.admin, "update contracts set status = 'cancelado' where id = $1", [ct])).rejects.toThrow(/não pode ser alterado/);
    await expect(t.as(u.admin, "delete from contracts where id = $1", [ct])).rejects.toThrow(/não pode ser excluído/);

    expect(await t.as(u.gestor, "select id from contracts")).toHaveLength(0);
    await t.as(u.admin, "update contracts set client_visible = true where id = $1", [ct]);
    expect(await t.as(u.gestor, "select id from contracts")).toHaveLength(1);
    expect(await t.as(u.outro, "select id from contracts")).toHaveLength(0);
    expect(await t.as(u.gestor, "update contracts set client_visible = false where id = $1 returning id", [ct])).toHaveLength(0);
  });

  it("rascunho pode ser excluído e fica na auditoria", async () => {
    const [row] = await t.as<{ id: string }>(u.admin, "insert into contracts (code, title) values ('CT-2026-002','Rascunho') returning id");
    expect(await t.as(u.admin, "delete from contracts where id = $1 returning id", [row.id])).toHaveLength(1);
    const audit = await t.as<{ action: string }>(u.admin, "select action from audit_log where entity = 'contracts' and entity_id = $1 order by id", [row.id]);
    expect(audit.map((a) => a.action)).toEqual(["insert", "delete"]);
  });

  it("arquivos: só o admin envia; cliente lê só o PDF assinado liberado", async () => {
    await expect(t.as(u.gestor, "insert into storage.objects (bucket_id, name) values ('contratos', $1)", [`${ct}/x.pdf`])).rejects.toThrow();
    await t.as(u.admin, "insert into storage.objects (bucket_id, name) values ('contratos', $1), ('contratos', $2)", [`${ct}/assinado-1.pdf`, `${ct}/a.pdf`]);
    const seen = await t.as<{ name: string }>(u.gestor, "select name from storage.objects where bucket_id = 'contratos'");
    expect(seen.map((r) => r.name)).toEqual([`${ct}/assinado-1.pdf`]);
    expect(await t.as(u.outro, "select name from storage.objects where bucket_id = 'contratos'")).toHaveLength(0);
  });
});
