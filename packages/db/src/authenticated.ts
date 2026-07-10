import { sql } from "drizzle-orm";
import { db } from "./client";

export type AuthenticatedTx = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export interface AuthenticatedContext {
  actorId: string;
}

/**
 * Runs `fn` inside a transaction with the Postgres role switched to
 * `authenticated` (or `anon` when `context` is null) and, for authenticated
 * calls, `request.jwt.claims` set to the caller's id — exactly what
 * PostgREST does per-request. RLS policies keyed on `auth.uid()` /
 * `auth.jwt()` evaluate for real inside `fn`, instead of running as the
 * superuser `DATABASE_URL` connection `@hebron/db/client` normally uses.
 *
 * `SET LOCAL` is transaction-scoped: it never leaks to the next query on a
 * pooled connection, whether the transaction commits or rolls back.
 *
 * This is the "client autenticado" pages/actions must adopt (P-0.10) so the
 * RLS policies already declared for admin/documentos/projetos/financeiro
 * (P-1.7/P-1.19/P-2.7/P-3.7) stop being dead code enforced only in tests.
 */
export async function withAuthenticatedContext<T>(
  context: AuthenticatedContext | null,
  fn: (tx: AuthenticatedTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (context) {
      const claims = JSON.stringify({
        sub: context.actorId,
        role: "authenticated",
      });
      await tx.execute(sql`SET LOCAL ROLE authenticated`);
      await tx.execute(
        sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
      );
    } else {
      await tx.execute(sql`SET LOCAL ROLE anon`);
    }

    return fn(tx);
  });
}

/**
 * Runs `fn` against the same `tx` opened by `withAuthenticatedContext`, but
 * with the role reset to the connection's own privileged role (`postgres`
 * for `DATABASE_URL`) for the duration of `fn` — same transaction, so still
 * atomic with the surrounding mutation, but bypassing RLS for tables that
 * are deliberately not writable by `authenticated` (e.g. `admin.audit_log`,
 * whose only INSERT policy is `TO service_role` — decision F3-15/S-57: the
 * audit trail must not be forgeable by an arbitrary authenticated session).
 *
 * `RESET ROLE` reverts to the session's own role (not a stack), so nesting
 * two calls would collapse to one level — restoring `authenticated`
 * unconditionally afterward is correct here because every caller of this
 * helper is already inside a `withAuthenticatedContext` transaction.
 */
export async function withSystemRole<T>(
  tx: AuthenticatedTx,
  fn: (tx: AuthenticatedTx) => Promise<T>,
): Promise<T> {
  await tx.execute(sql`RESET ROLE`);
  try {
    return await fn(tx);
  } finally {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
  }
}
