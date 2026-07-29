"use client";

import * as React from "react";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import type { LinkComponent } from "./navigation-sidebar";
import { resolveNotificationHref } from "./ecosystem-apps";

export interface NotificationBellListResult {
  items: NotificationItem[];
  unreadCount: number;
}

export interface NotificationBellContainerProps {
  /** Id canônico do app atual (mesmo id de ECOSYSTEM_APPS) — resolve hrefs cross-app. */
  currentAppId: string;
  /** URL da central completa de notificações do app atual. */
  centerHref: string;
  /** Busca as últimas notificações + contagem de não lidas do usuário logado. */
  listNotifications: () => Promise<NotificationBellListResult>;
  /** Marca uma notificação como lida. */
  markRead: (id: string) => Promise<void>;
  /** Marca todas as notificações do usuário como lidas. */
  markAllRead: () => Promise<void>;
  /** Navegação — o app injeta router.push (ou equivalente). */
  navigate: (href: string) => void;
  /** Componente de link do roteador do app (ex.: next/link), usado no rodapé "Ver todas". */
  LinkComponent?: LinkComponent;
  className?: string;
}

/**
 * Fiação fina do `NotificationBell` (P-0.6b): busca dados e injeta as
 * actions do app via props, sem depender de `next/*` neste pacote. O app
 * consumidor só precisa passar server actions + um `navigate`.
 */
export function NotificationBellContainer({
  currentAppId,
  centerHref,
  listNotifications,
  markRead,
  markAllRead,
  navigate,
  LinkComponent,
  className,
}: NotificationBellContainerProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refresh = React.useCallback(() => {
    listNotifications()
      .then((result) => {
        setNotifications(result.items);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => undefined);
  }, [listNotifications]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRead = React.useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      const href = resolveNotificationHref(
        notification?.payload ?? null,
        currentAppId,
      );
      void markRead(id).then(refresh);
      navigate(href);
    },
    [notifications, currentAppId, markRead, refresh, navigate],
  );

  const handleMarkAllRead = React.useCallback(() => {
    void markAllRead().then(refresh);
  }, [markAllRead, refresh]);

  return (
    <NotificationBell
      notifications={notifications}
      unreadCount={unreadCount}
      centerHref={centerHref}
      onRead={handleRead}
      onMarkAllRead={handleMarkAllRead}
      LinkComponent={LinkComponent}
      className={className}
    />
  );
}
