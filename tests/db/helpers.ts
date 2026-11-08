import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

/**
 * Banco de testes: um Postgres local com uma emulação mínima do Supabase
 * (papéis anon/authenticated, auth.uid(), auth.jwt()). As migrações reais
 * de supabase/migrations são aplicadas do zero antes da suíte.
 *
 * Configure com TEST_DATABASE_URL (padrão: postgres local na porta 54322).
 */
export const ADMIN_URL =
  process.env.TEST_DATABASE_ADMIN_URL ?? "postgresql://postgres@localhost:54322/postgres?host=/tmp";
export const TEST_DB = "tribuna_vitest";

const root = path.resolve(__dirname, "../..");

export function sqlFiles(): string[] {
  const migrations = readdirSync(path.join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(root, "supabase/migrations", f));
  return [path.join(root, "supabase/tests/supabase-shim.sql"), ...migrations, path.join(root, "supabase/seed.sql")];
}

export function testUrl(): string {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${TEST_DB}`;
  return u.toString();
}

export async function resetDatabase(): Promise<void> {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${TEST_DB} with (force)`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  const db = new pg.Client({ connectionString: testUrl() });
  await db.connect();
  for (const file of sqlFiles()) {
    await db.query(readFileSync(file, "utf8"));
  }
  await db.end();
}

/** O Postgres de testes está acessível? (senão, os testes de banco são pulados) */
export async function dbAvailable(): Promise<boolean> {
  const c = new pg.Client({ connectionString: ADMIN_URL, connectionTimeoutMillis: 1500 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    console.warn("\n⚠ Postgres de testes indisponível: testes de RLS pulados. Veja o README (seção Testes).\n");
    return false;
  }
}

export type TestUser = { id: string; email: string };

let pool: pg.Pool | null = null;
export function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: testUrl(), max: 4 });
  return pool;
}
export async function closePool() {
  await pool?.end();
  pool = null;
}

/** Executa como superusuário (sem RLS), para preparar cenários. */
export async function asRoot<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await getPool().connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

/**
 * Executa `fn` numa transação com o papel de um visitante (user = null) ou de
 * um usuário logado, exatamente como o PostgREST do Supabase faz. Tudo é
 * desfeito ao final (rollback), então os testes não interferem entre si.
 */
export async function as<T>(user: TestUser | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await getPool().connect();
  try {
    await c.query("begin");
    if (user) {
      await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: user.id, email: user.email, role: "authenticated" }),
      ]);
    } else {
      await c.query("set local role anon");
      await c.query("select set_config('request.jwt.claims', '', true)");
    }
    return await fn(c);
  } finally {
    await c.query("rollback").catch(() => {});
    c.release();
  }
}

export async function createUser(email: string, role?: "admin" | "editor" | "colunista"): Promise<TestUser> {
  return asRoot(async (c) => {
    const { rows } = await c.query<{ id: string }>(
      "insert into auth.users (email) values ($1) returning id",
      [email],
    );
    if (role) {
      await c.query(
        "insert into public.allowed_emails (email, role) values ($1, $2) on conflict (email) do update set role = excluded.role",
        [email, role],
      );
    }
    return { id: rows[0].id, email };
  });
}

export async function sectionId(slug = "politica"): Promise<string> {
  return asRoot(async (c) => (await c.query("select id from sections where slug = $1", [slug])).rows[0].id);
}

let n = 0;
export function uniqueSlug(prefix = "texto"): string {
  n += 1;
  return `${prefix}-${Date.now().toString(36)}-${n}`;
}

/** Espera que a promessa falhe por permissão/regra do banco. */
export async function expectDenied(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("Era esperado que o banco recusasse a operação, mas ela foi aceita.");
}
