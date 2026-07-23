"use server";

import { z } from "zod";
import {
  listNotifications,
  countUnread,
  markNotificationRead,
  markAllNotificationsRead,
} from "@hebron/db/notifications";
import type { Notification } from "@hebron/db/schema";
import type { NotificationItem } from "@hebron/ui";
import { flatsAction } from "../lib/safe-action";

const BELL_LIMIT = 10;

function toNotificationItem(n: Notification): NotificationItem {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    payload: (n.payload as Record<string, unknown> | null) ?? null,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// listBellNotifications — últimas BELL_LIMIT + contagem de não lidas, para o
// dropdown do sino no header (@hebron/ui NotificationBellContainer).
// ---------------------------------------------------------------------------

export const listBellNotifications = flatsAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const [{ items }, unreadCount] = await Promise.all([
      listNotifications({ userId: ctx.actorId, limit: BELL_LIMIT, offset: 0 }),
      countUnread(ctx.actorId),
    ]);

    return {
      items: items.map(toNotificationItem),
      unreadCount,
    };
  });

// ---------------------------------------------------------------------------
// listCenterNotifications — página de notificações (paginação incremental).
// ---------------------------------------------------------------------------

export const listCenterNotifications = flatsAction
  .schema(
    z.object({
      limit: z.number().int().min(1).max(50),
      offset: z.number().int().min(0),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { items, total } = await listNotifications({
      userId: ctx.actorId,
      limit: parsedInput.limit,
      offset: parsedInput.offset,
    });

    return { items: items.map(toNotificationItem), total };
  });

// ---------------------------------------------------------------------------
// markNotificationReadAction / markAllNotificationsReadAction — usuário só
// marca as próprias notificações (ctx.actorId, nunca um userId do input) —
// gate na action + RLS notifications_update_own como segunda camada.
// ---------------------------------------------------------------------------

export const markNotificationReadAction = flatsAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await markNotificationRead(parsedInput.id, ctx.actorId);
  });

export const markAllNotificationsReadAction = flatsAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.actorId);
  });
