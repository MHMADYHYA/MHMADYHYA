/**
 * بيئة اختبار لقاعدة البيانات: PGlite (Postgres جوا Node) + محاكاة بسيطة لـ Supabase
 * (schema auth مع auth.uid() وauth.users، والأدوار anon/authenticated/service_role).
 * بتشغّل كل ملفات supabase/migrations بالترتيب.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema if not exists auth;
  create table auth.users (
    id uuid primary key,
    email text unique,
    created_at timestamptz not null default now()
  );

  -- نفس سلوك Supabase: بيقرأ sub من request.jwt.claims
  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
  $$;

  create or replace function auth.role() returns text
  language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  $$;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`

export type DbRole = 'anon' | 'authenticated' | 'service_role'

export class TestDb {
  private constructor(readonly pg: PGlite) {}

  static async create(): Promise<TestDb> {
    const pg = new PGlite({ extensions: { btree_gist, pgcrypto } })
    await pg.waitReady
    await pg.exec(SUPABASE_SHIM)
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      await pg.exec(sql)
    }
    return new TestDb(pg)
  }

  /** تشغيل استعلام كمستخدم معيّن (بيطبّق RLS زي Supabase) */
  async as<T = Record<string, unknown>>(
    role: DbRole,
    userId: string | null,
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const claims = userId ? JSON.stringify({ sub: userId, role }) : JSON.stringify({ role })
    return this.pg.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [claims])
      await tx.exec(`set local role ${role}`)
      const result = await tx.query<T>(sql, params)
      return result.rows
    })
  }

  /** كمشرف مسجّل دخول */
  asAdmin<T = Record<string, unknown>>(userId: string, sql: string, params: unknown[] = []) {
    return this.as<T>('authenticated', userId, sql, params)
  }

  /** كزائر بدون تسجيل دخول */
  asAnon<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.as<T>('anon', null, sql, params)
  }

  /** كالنظام (بدون RLS)، للتجهيز والفحص */
  async root<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pg.query<T>(sql, params)
    return result.rows
  }

  /** إنشاء مستخدم بـ auth.users (أول واحد بيصير مشرف تلقائياً) */
  async createAuthUser(email: string): Promise<string> {
    const rows = await this.root<{ id: string }>(
      `insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id`,
      [email],
    )
    return rows[0].id
  }

  async close() {
    await this.pg.close()
  }
}
