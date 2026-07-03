# @hebron/db

Drizzle ORM schemas and custom SQL migration runner for the Hebron Aseec monorepo.

## Migration flow

Migrations are **numbered SQL files** in `src/migrations/`. They are the single source of truth and are applied by a custom idempotent runner, not by `drizzle-kit migrate`.

### Why not `drizzle-kit generate`?

Several migrations contain RLS policies, table partitions, `SECURITY DEFINER` functions, and other constructs that Drizzle Kit cannot generate or diff correctly. Keeping migrations as hand-authored SQL gives us full control.

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

### Adding a new migration

1. Create `src/migrations/NNNN_short_description.sql` (zero-padded, alphabetical order is the execution order).
2. Write idempotent SQL where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ BEGIN … EXCEPTION WHEN duplicate_object …`).
3. If the file contains `ALTER TYPE … ADD VALUE`, add a comment noting it runs outside a transaction — the runner detects this automatically.
4. **Never edit a migration that has already been applied.** Create a new file instead.
5. Run `pnpm --filter @hebron/db db:migrate`.

### Other scripts

| Script        | Purpose                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| `db:generate` | Generate a Drizzle migration snapshot (for reference only — do not use to apply migrations) |
| `db:push`     | Push schema directly to the database (dev only, never in production)                        |
| `db:studio`   | Open Drizzle Studio connected to `DATABASE_URL`                                             |

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
