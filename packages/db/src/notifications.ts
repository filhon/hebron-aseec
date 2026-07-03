import { db } from "./client";
import { notifications } from "./schema/notifications";
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
