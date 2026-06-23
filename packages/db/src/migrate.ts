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
  "0000_easy_alex_power",
  "0000_initial",
  "0001_notifications",
  "0002_admin",
  "0003_admin_rls",
];

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

    // Seed baseline records (idempotent — ON CONFLICT DO NOTHING)
    for (const id of BASELINE_IDS) {
      await sql`
        INSERT INTO public._migrations (id) VALUES (${id})
        ON CONFLICT DO NOTHING
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
