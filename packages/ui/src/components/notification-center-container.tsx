"use client";

import * as React from "react";
import { NotificationCenter } from "./notification-center";
import type { NotificationItem } from "./notification-bell";
import { resolveNotificationHref } from "./ecosystem-apps";

export interface NotificationCenterListResult {
  items: NotificationItem[];
  total: number;
}

export interface NotificationCenterContainerProps {
  /** Id canônico do app atual (mesmo id de ECOSYSTEM_APPS) — resolve hrefs cross-app. */
  currentAppId: string;
  /** Quantidade de notificações buscada por página (padrão: 20). */
  pageSize?: number;
  /** Busca uma página de notificações (mais recentes primeiro) + total geral. */
  listNotifications: (params: {
    limit: number;
    offset: number;
  }) => Promise<NotificationCenterListResult>;
  /** Marca uma notificação como lida. */
  markRead: (id: string) => Promise<void>;
  /** Marca todas as notificações do usuário como lidas. */
  markAllRead: () => Promise<void>;
  /** Navegação — o app injeta router.push (ou equivalente). */
  navigate: (href: string) => void;
  className?: string;
}

/**
 * Fiação fina do `NotificationCenter` (P-0.6b): paginação incremental via
 * `listNotifications`, sem depender de `next/*` neste pacote. A aba
 * "não lidas" é um filtro client-side dentro do próprio `NotificationCenter`
 * sobre o que já foi carregado — este container só alimenta a lista "todas".
 */
export function NotificationCenterContainer({
  currentAppId,
  pageSize = 20,
  listNotifications,
  markRead,
  markAllRead,
  navigate,
  className,
}: NotificationCenterContainerProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [total, setTotal] = React.useState(0);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const result = await listNotifications({ limit: pageSize, offset });
      setTotal(result.total);
      setNotifications((prev) =>
        offset === 0 ? result.items : [...prev, ...result.items],
      );
    },
    [listNotifications, pageSize],
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const handleLoadMore = React.useCallback(() => {
    setIsLoadingMore(true);
    void loadPage(notifications.length).finally(() => setIsLoadingMore(false));
  }, [loadPage, notifications.length]);

  const handleRead = React.useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      const href = resolveNotificationHref(
        notification?.payload ?? null,
        currentAppId,
      );
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)),
      );
      void markRead(id);
      navigate(href);
    },
    [notifications, currentAppId, markRead, navigate],
  );

  const handleMarkAllRead = React.useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? now })),
    );
    void markAllRead();
  }, [markAllRead]);

  return (
    <NotificationCenter
      notifications={notifications}
      total={total}
      isLoadingMore={isLoadingMore}
      hasMore={notifications.length < total}
      onLoadMore={handleLoadMore}
      onRead={handleRead}
      onMarkAllRead={handleMarkAllRead}
      className={className}
    />
  );
}
