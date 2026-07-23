import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "./client";
import { withAuthenticatedContext } from "./authenticated";
import { notifications, type Notification } from "./schema/notifications";
import type { InsertNotificationFn } from "@hebron/email/types";

/**
 * Returns the DB-insert half of `createNotification` (see `@hebron/email`),
 * wired to the singleton `db`. Previously each app (admin, documentos,
 * projetos) hand-rolled an identical ~15-line version of this function.
 */
export function makeNotificationInserter(): InsertNotificationFn {
  return async (data) => {
    const [record] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        channel: data.channel,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        payload: (data.payload ?? null) as Record<string, unknown> | null,
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
      })
      .returning({ id: notifications.id });
    if (!record) throw new Error("Falha ao registrar notificação");
    return record;
  };
}

export interface ListNotificationsParams {
  userId: string;
  unreadOnly?: boolean;
  limit: number;
  offset: number;
}

export interface ListNotificationsResult {
  items: Notification[];
  total: number;
}

/**
 * Notificações de um usuário, mais recentes primeiro, com paginação e total
 * geral (para paginação incremental na central). Roda como `authenticated`
 * (P-0.10) com `user_id` no WHERE — RLS (`notifications_select_own`) é a
 * segunda camada, nunca a única (defense in depth).
 */
export async function listNotifications(
  params: ListNotificationsParams,
): Promise<ListNotificationsResult> {
  const { userId, unreadOnly = false, limit, offset } = params;

  return withAuthenticatedContext({ actorId: userId }, async (tx) => {
    const condition = unreadOnly
      ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
      : eq(notifications.userId, userId);

    const [items, totalRows] = await Promise.all([
      tx
        .select()
        .from(notifications)
        .where(condition)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      tx.select({ value: count() }).from(notifications).where(condition),
    ]);

    return { items, total: totalRows[0]?.value ?? 0 };
  });
}

/**
 * Contagem de notificações não lidas de um usuário — usada no badge do
 * `NotificationBell`. Mesma defesa em profundidade de `listNotifications`.
 */
export async function countUnread(userId: string): Promise<number> {
  return withAuthenticatedContext({ actorId: userId }, async (tx) => {
    const rows = await tx
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
    return rows[0]?.value ?? 0;
  });
}

/**
 * Marca uma notificação como lida — restrita ao próprio dono (`userId` no
 * WHERE + RLS `notifications_update_own`). Se `id` não pertencer a `userId`,
 * a atualização afeta zero linhas em silêncio (não vaza se o id existe).
 */
export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<void> {
  await withAuthenticatedContext({ actorId: userId }, (tx) =>
    tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId))),
  );
}

/** Marca todas as notificações não lidas de um usuário como lidas. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await withAuthenticatedContext({ actorId: userId }, (tx) =>
    tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      ),
  );
}
