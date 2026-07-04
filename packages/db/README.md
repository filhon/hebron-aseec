# @hebron/db

Drizzle ORM schemas and custom SQL migration runner for the Hebron Aseec monorepo.

## Migration flow

Migrations are **numbered SQL files** in `src/migrations/`. They are the single source of truth and are applied by a custom idempotent runner, not by `drizzle-kit migrate`.

### Why not `drizzle-kit migrate`?

Several migrations contain RLS policies, table partitions, `SECURITY DEFINER` functions, and other constructs that Drizzle Kit cannot generate or diff correctly. Keeping the _apply_ step as hand-authored SQL run by our own runner gives us full control over those constructs.

That said, `drizzle-kit generate` **is** the starting point for authoring a migration (P-0.11) — it diffs `schema/index.ts` against `src/migrations/meta/` and scaffolds the plain-DDL part (tables, columns, enums, indexes it understands) as a new numbered SQL file. You then review and extend that file by hand for anything generate can't produce (RLS, partitions, functions), exactly as before.

### Adding a new migration

1. Change `schema/*.ts`, then run:
   ```bash
   pnpm --filter @hebron/db db:generate
   ```
   This creates `src/migrations/NNNN_<name>.sql` with the next number — **migrations are no longer numbered by hand**; whatever `drizzle-kit generate` assigns is the number. Pass `--name` to control the description (e.g. `db:generate --name add_flats_bookings`).
2. Review the generated SQL. Add by hand whatever `generate` cannot produce: RLS policies, partitions, `SECURITY DEFINER` functions, `CREATE INDEX CONCURRENTLY`, `ALTER TYPE … ADD VALUE`, seed data, etc.
3. Write idempotent SQL where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ BEGIN … EXCEPTION WHEN duplicate_object …`).
4. If the file contains `ALTER TYPE … ADD VALUE`, add a comment noting it runs outside a transaction — the runner detects this automatically.
5. **Never edit a migration that has already been applied.** Create a new one instead (`db:generate` again).
6. Run `pnpm --filter @hebron/db db:migrate` to apply it.

Run `pnpm --filter @hebron/db db:check` (`drizzle-kit check`) any time to confirm `schema/index.ts` and `src/migrations/meta/` haven't drifted apart — it should always report "Everything's fine" on a clean working tree, since `generate` is how meta gets updated in the first place.

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

| Script      | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `db:check`  | Verify `schema/index.ts` and `src/migrations/meta/` haven't drifted apart |
| `db:push`   | Push schema directly to the database (dev only, never in production)      |
| `db:studio` | Open Drizzle Studio connected to `DATABASE_URL`                           |
| `test`      | Run the schema parity test (see below) against `DATABASE_URL`             |

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
