import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "Add it to .env.local at the monorepo root.\n" +
      "Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres",
  );
}

const MIGRATIONS_DIR = join(__dirname, "migrations");

// SQL files that existed before this runner was introduced and are already
// applied in the database. Inserted as baseline records on first run so they
// are never re-executed.
const BASELINE_IDS = [
  "0000_initial",
  "0001_notifications",
  "0002_admin",
  "0003_admin_rls",
];

// 0000_easy_alex_power.sql was a duplicate of 0000_initial.sql (auto-generated
// by drizzle-kit, superseded by the hand-authored version with the FK to
// auth.users and RLS) and has been deleted (P-0.7). Its baseline bookkeeping
// row is stale on databases where the runner already ran — clean it up.
const STALE_IDS = ["0000_easy_alex_power"];

// Migration files renamed after being applied in production keep their
// bookkeeping row in sync so the runner doesn't try to re-apply them under
// the new id (P-0.7: 0009_financeiro_rls ordered before 0010_financeiro,
// which created the tables it modifies — renamed to run after it).
const ID_RENAMES: Record<string, string> = {
  "0009_financeiro_rls": "0011_financeiro_rls",
  // 0019: nome auto-gerado pelo drizzle-kit sobreviveu ao P-0.3c (hand-written
  // SQL como fonte de verdade) — já aplicada em produção sob o nome antigo
  // (D6-004/Resíduo, PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md).
  "0019_shocking_wrecking_crew": "0019_plataforma_schema",
};

// ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
const isNonTransactional = (sql: string) =>
  /ALTER\s+TYPE\s+\S+\s+ADD\s+VALUE/i.test(sql);

async function migrate() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public._migrations (
        id          text        PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `;

    // Baseline records only apply to a database that already had these
    // objects created before this runner existed (production, or a restore
    // of it). A genuinely fresh/ephemeral database (CI, a new Supabase
    // project) has none of this — seeding the baseline there would make the
    // runner skip 0000_initial..0003_admin_rls without ever running them,
    // so every later migration referencing their schemas/types/tables would
    // fail. Detect which case this is before seeding.
    const [{ exists: alreadyBootstrapped }] = await sql<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `;

    if (alreadyBootstrapped) {
      for (const id of BASELINE_IDS) {
        await sql`
          INSERT INTO public._migrations (id) VALUES (${id})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Drop bookkeeping rows for deleted migration files (idempotent — no-op
    // if the row was never inserted, e.g. on a freshly rebuilt database).
    for (const id of STALE_IDS) {
      await sql`DELETE FROM public._migrations WHERE id = ${id}`;
    }

    // Rename bookkeeping rows for migration files that were renamed after
    // being applied (idempotent — no-op if the old id was never recorded).
    for (const [from, to] of Object.entries(ID_RENAMES)) {
      await sql`
        UPDATE public._migrations SET id = ${to} WHERE id = ${from}
      `;
    }

    const appliedSet = new Set(
      (await sql<{ id: string }[]>`SELECT id FROM public._migrations`).map(
        (r) => r.id,
      ),
    );

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const id = file.replace(/\.sql$/, "");

      if (appliedSet.has(id)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      const content = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      const noTx = isNonTransactional(content);

      console.log(`  apply ${file}${noTx ? " (no-transaction)" : ""} ...`);

      if (noTx) {
        await sql.unsafe(content);
        await sql`INSERT INTO public._migrations (id) VALUES (${id})`;
      } else {
        await sql.begin(async (tx) => {
          await tx.unsafe(content);
          await tx`INSERT INTO public._migrations (id) VALUES (${id})`;
        });
      }

      appliedSet.add(id);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log("Nothing to apply — database is up to date.");
    } else {
      console.log(`\nApplied ${appliedCount} migration(s).`);
    }
  } finally {
    await sql.end();
  }
}

migrate().catch((err: unknown) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
