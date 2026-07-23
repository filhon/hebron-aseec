/**
 * notifications.test.ts — P-0.6b (notificações in_app operáveis).
 *
 * Testa os helpers de packages/db/src/notifications.ts (listNotifications/
 * countUnread/markNotificationRead/markAllNotificationsRead) contra o banco
 * real e as policies RLS de public.notifications (notifications_select_own/
 * notifications_update_own): cada usuário só lê/marca as próprias
 * notificações — gate na action + RLS como segunda camada (defense in depth).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, notifications } from "@hebron/db/schema";
import {
  listNotifications,
  countUnread,
  markNotificationRead,
  markAllNotificationsRead,
} from "@hebron/db/notifications";

const IDS = {
  owner: "d3000000-0000-0000-0000-000000000001",
  outro: "d3000000-0000-0000-0000-000000000002",
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL)
  throw new Error("DATABASE_URL is required for notifications tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

async function inRolledBackTx<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await sql.begin(async (tx) => {
      result = await fn(tx);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (!(err instanceof Error) || err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }
  return result as T;
}

async function setRole(
  tx: postgres.TransactionSql,
  userId: string,
): Promise<void> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  await tx`SET LOCAL ROLE authenticated`;
  await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      { id: IDS.owner, email: "notif-owner@test.hebron", fullName: "Dono" },
      { id: IDS.outro, email: "notif-outro@test.hebron", fullName: "Outro" },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(notifications).where(eq(notifications.userId, IDS.owner));
  await db.delete(notifications).where(eq(notifications.userId, IDS.outro));
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
  await sql.end();
});

describe("listNotifications / countUnread / markNotificationRead / markAllNotificationsRead", () => {
  it("lista notificações do próprio usuário, mais recentes primeiro, sem vazar de outro", async () => {
    // createdAt explícito: uma única instrução INSERT compartilha o mesmo
    // now() para todas as linhas (now() é o horário de início da transação em
    // Postgres, não do statement) — sem isso o ORDER BY createdAt DESC teria
    // empate e a ordem "mais recentes primeiro" ficaria indefinida no teste.
    await db.insert(notifications).values([
      {
        userId: IDS.owner,
        title: "Primeira",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        userId: IDS.owner,
        title: "Segunda",
        createdAt: new Date("2026-01-01T10:00:01Z"),
      },
      { userId: IDS.outro, title: "De outro usuário" },
    ]);

    const { items, total } = await listNotifications({
      userId: IDS.owner,
      limit: 10,
      offset: 0,
    });

    expect(total).toBe(2);
    expect(items).toHaveLength(2);
    expect(items.every((n) => n.userId === IDS.owner)).toBe(true);
    expect(items[0]?.title).toBe("Segunda");
  });

  it("respeita limit/offset (paginação incremental)", async () => {
    const page1 = await listNotifications({
      userId: IDS.owner,
      limit: 1,
      offset: 0,
    });
    const page2 = await listNotifications({
      userId: IDS.owner,
      limit: 1,
      offset: 1,
    });

    expect(page1.items).toHaveLength(1);
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });

  it("unreadOnly filtra só as não lidas", async () => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.owner));
    const [first] = rows;
    if (!first) throw new Error("Notificação não encontrada");

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, first.id));

    const { items, total } = await listNotifications({
      userId: IDS.owner,
      unreadOnly: true,
      limit: 10,
      offset: 0,
    });

    expect(total).toBe(1);
    expect(items).toHaveLength(1);
    expect(items[0]?.readAt).toBeNull();
  });

  it("countUnread conta só as não lidas do usuário", async () => {
    expect(await countUnread(IDS.owner)).toBe(1);
    expect(await countUnread(IDS.outro)).toBe(1);
  });

  it("markNotificationRead só marca quando a notificação pertence ao userId informado", async () => {
    const [target] = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, IDS.owner), isNull(notifications.readAt)),
      );
    if (!target) throw new Error("Notificação não encontrada");

    // Outro usuário tentando marcar a notificação do dono: no-op silencioso.
    await markNotificationRead(target.id, IDS.outro);
    const [stillUnread] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, target.id));
    expect(stillUnread?.readAt).toBeNull();

    await markNotificationRead(target.id, IDS.owner);
    const [nowRead] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, target.id));
    expect(nowRead?.readAt).not.toBeNull();
  });

  it("markAllNotificationsRead marca todas as não lidas do usuário, e só as dele", async () => {
    await db
      .insert(notifications)
      .values({ userId: IDS.owner, title: "Terceira" });

    await markAllNotificationsRead(IDS.owner);

    const ownerUnread = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, IDS.owner), isNull(notifications.readAt)),
      );
    expect(ownerUnread).toHaveLength(0);

    const outroUnread = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, IDS.outro), isNull(notifications.readAt)),
      );
    expect(outroUnread).toHaveLength(1);
  });
});

describe("RLS — public.notifications", () => {
  it("titular lê as próprias notificações", async () => {
    const rows = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.owner);
      return tx.unsafe(
        `SELECT id FROM public.notifications WHERE user_id = '${IDS.owner}'`,
      );
    });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("um usuário NÃO lê notificações de outro", async () => {
    const rows = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.outro);
      return tx.unsafe(
        `SELECT id FROM public.notifications WHERE user_id = '${IDS.owner}'`,
      );
    });
    expect(rows).toHaveLength(0);
  });

  it("um usuário NÃO marca como lida notificação de outro via UPDATE direto", async () => {
    const [target] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.owner))
      .limit(1);
    if (!target) throw new Error("Notificação não encontrada");

    const updated = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.outro);
      return tx.unsafe(
        `UPDATE public.notifications SET read_at = now() WHERE id = '${target.id}' RETURNING id`,
      );
    });
    expect(updated).toHaveLength(0);
  });

  it("anon não lê nenhuma notificação", async () => {
    const rows = await inRolledBackTx(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      return tx.unsafe(`SELECT id FROM public.notifications`);
    });
    expect(rows).toHaveLength(0);
  });
});
