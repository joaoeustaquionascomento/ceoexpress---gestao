/**
 * Confere a importação do conteúdo do portal original da FIQ Brasil
 * (supabase/seed/fiq-brasil.sql) num PostgreSQL real, com as migrações aplicadas.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const ADMIN_URL = process.env.TEST_DATABASE_URL;
const DB_NAME = `ceo_seed_${Date.now()}`;
let db: Client;

describe.skipIf(!ADMIN_URL)("base inicial FIQ Brasil", () => {
  beforeAll(async () => {
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`create database ${DB_NAME}`);
    await admin.end();
    const u = new URL(ADMIN_URL!);
    u.pathname = `/${DB_NAME}`;
    db = new Client({ connectionString: u.toString() });
    await db.connect();
    await db.query(readFileSync(join(ROOT, "tests/db/supabase-stub.sql"), "utf8"));
    const dir = join(ROOT, "supabase/migrations");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await db.query(readFileSync(join(dir, f), "utf8"));
    }
    const seed = readFileSync(join(ROOT, "supabase/seed/fiq-brasil.sql"), "utf8");
    await db.query(seed);
    await db.query(seed); // idempotente: rodar duas vezes não duplica
  });

  afterAll(async () => {
    await db?.end();
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB_NAME} with (force)`);
    await admin.end();
  });

  const count = async (sql: string) => Number((await db.query(sql)).rows[0].n);

  it("importa os 16 pedidos com os 42 subitens e suas orientações", async () => {
    expect(await count("select count(*) n from info_requests")).toBe(16);
    expect(await count("select sum(jsonb_array_length(checklist)) n from info_requests")).toBe(42);
    expect(
      await count(
        "select count(*) n from info_requests r, jsonb_array_elements(r.checklist) e where coalesce(e->>'instrucao','') = ''",
      ),
    ).toBe(0);
    const d01 = (await db.query("select title, purpose, minimum_content, due_on::text from info_requests where code = 'D01'")).rows[0];
    expect(d01).toMatchObject({ title: "Via assinada e anexos aceitos", due_on: "2026-11-23" });
    expect(d01.purpose).toContain("calendário");
  });

  it("importa as 30 ações do plano, todas ligadas a uma prioridade P1–P3", async () => {
    expect(await count("select count(*) n from action_items")).toBe(30);
    expect(await count("select count(*) n from action_items where objective_id is null")).toBe(0);
    expect(await count("select count(*) n from objectives")).toBe(3);
  });

  it("importa agenda, marcos e registro de decisões", async () => {
    expect(await count("select count(*) n from meetings")).toBe(5);
    expect(await count("select count(*) n from milestones")).toBe(5);
    expect(await count("select count(*) n from decisions")).toBe(8);
    expect(await count("select count(*) n from decisions where visibility <> 'internal'")).toBe(0);
  });
});
