import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

export const ROOT = join(__dirname, "..", "..");
export const ADMIN_URL = process.env.TEST_DATABASE_URL;

/** Cria um banco novo com o stub do Supabase e todas as migrações aplicadas. */
export async function createTestDb(prefix: string) {
  const name = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const u = new URL(ADMIN_URL!);
  u.pathname = `/${name}`;
  const db = new Client({ connectionString: u.toString() });
  await db.connect();
  await db.query(readFileSync(join(ROOT, "tests/db/supabase-stub.sql"), "utf8"));
  const dir = join(ROOT, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(join(dir, f), "utf8"));
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

  async function cleanup() {
    await db.end();
    const a = new Client({ connectionString: ADMIN_URL });
    await a.connect();
    await a.query(`drop database if exists ${name} with (force)`);
    await a.end();
  }

  async function addUser(id: string, email: string, fullName: string, role: string) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    await db.query("insert into profiles (id, email, full_name, platform_role) values ($1, $2, $3, $4)", [
      id,
      email,
      fullName,
      role,
    ]);
  }

  /**
   * Reaplica a troca de códigos (D01 → PI-01, A01 → AP-01) depois de carregar
   * dados antigos, como aconteceu em produção.
   */
  async function renameCodes() {
    const sql = readFileSync(join(dir, "20261121001100_relatorios_codigos.sql"), "utf8");
    await db.query(sql.slice(sql.indexOf("-- 2. Códigos")));
  }

  return { db, as, cleanup, addUser, renameCodes };
}
