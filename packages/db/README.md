# @hebron/db

Drizzle ORM schemas and custom SQL migration runner for the Hebron Aseec monorepo.

## Migration flow

Migrations are **hand-numbered SQL files** in `src/migrations/` (`NNNN_<name>.sql`). They are the single source of truth and are applied by a custom idempotent runner, not by `drizzle-kit migrate`.

### `drizzle-kit generate`/`check`/`push` are retired

This project **does not use** `drizzle-kit generate`, `drizzle-kit check`, or `drizzle-kit push`. They were tried early on (P-0.3b) and abandoned (P-0.3c): the `meta/` journal and snapshots they depend on drifted completely out of sync with the real numbered `.sql` files (wrong names, missing tags, snapshots frozen dozens of migrations behind), and several migrations contain RLS policies, table partitions, `SECURITY DEFINER` functions, and other constructs Drizzle Kit cannot generate or diff correctly. Running `generate` or `check` against this repo will diff against a stale/absent baseline and either report false drift or emit a colliding, duplicate migration file. **Do not run them.**

`drizzle-kit` remains a devDependency only for `db:studio` (schema browsing/type inference), which does not read `meta/` or `out`.

### Adding a new migration

1. Change `schema/*.ts` to match the DDL you're about to write (keeps ORM types correct).
2. Create `src/migrations/NNNN_<name>.sql` by hand, where `NNNN` is the highest existing number + 1 (check `src/migrations/` for the current max — next is `0060`).
3. Author the SQL yourself: tables, columns, enums, indexes, RLS policies, partitions, `SECURITY DEFINER` functions, `ALTER TYPE … ADD VALUE`, seed data, etc.
4. Write idempotent SQL where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ BEGIN … EXCEPTION WHEN duplicate_object …`).
5. If the file contains `ALTER TYPE … ADD VALUE`, add a comment noting it runs outside a transaction — the runner detects this automatically.
6. **Never edit a migration that has already been applied.** Create a new one instead, with the next number.
7. Run `pnpm --filter @hebron/db db:migrate` to apply it.

The drift guard is `src/__tests__/schema-parity.test.ts` (runs in CI via `pnpm turbo test`), **not** `db:check` — see below.

### Apply pending migrations

```bash
pnpm --filter @hebron/db db:migrate
```

The runner:

1. Creates `public._migrations(id text primary key, applied_at timestamptz)` if it does not exist.
2. Seeds baseline records for migrations that were applied before this runner existed (0000–0003) so they are never re-executed.
3. Reads all `*.sql` files in `src/migrations/` sorted alphabetically.
4. Skips files already recorded in `_migrations`.
5. Applies each pending file inside a transaction, then records its id.
   - Exception: files containing `ALTER TYPE … ADD VALUE` run outside a transaction (PostgreSQL requirement) and are recorded immediately after.

The command is **idempotent** — running it twice is safe.

### Other scripts

| Script      | Purpose                                                       |
| ----------- | ------------------------------------------------------------- |
| `db:studio` | Open Drizzle Studio connected to `DATABASE_URL`               |
| `test`      | Run the schema parity test (see below) against `DATABASE_URL` |

### Schema parity test

`src/__tests__/schema-parity.test.ts` connects to `DATABASE_URL` and asserts, in both directions, that every table/column/enum in `schema/index.ts` exists in the database and vice versa. It exists because the migrations are hand-authored SQL, not applied by `drizzle-kit migrate` — this is what catches a TS declaration and a SQL migration drifting apart (the class of bug that once left `admin.audit_action` missing values for two modules, silently breaking their audit trail). It runs in CI (`pnpm turbo test`, P-0.9) against the freshly migrated ephemeral database, and can be run locally against any migrated `DATABASE_URL`.

### admin.audit_log partitioning

`admin.audit_log` is range-partitioned by month (`created_at`). Explicit partitions exist through 2027-12 (`0002_admin.sql` + `0013_audit_log_partitions.sql`), plus an `admin.audit_log_default` catch-all partition as a safety net. A `pg_cron` job (`admin_audit_log_create_partitions`, scheduled `0 3 1 * *`) creates the next 3 months of partitions automatically on the 1st of every month via `admin.create_audit_log_partition_for_month(date)` — no manual migration is needed to keep partitioning ahead of the calendar. If the job ever needs to be re-created manually:

```sql
SELECT cron.schedule(
  'admin_audit_log_create_partitions',
  '0 3 1 * *',
  $$ SELECT admin.create_audit_log_partition_for_month(
       (date_trunc('month', now()) + (n || ' month')::interval)::date
     ) FROM generate_series(1, 3) AS n; $$
);
```

### Environment

Set `DATABASE_URL` in `.env.local` at the monorepo root:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

Use the **direct connection string** (port 5432), not the transaction pooler.
