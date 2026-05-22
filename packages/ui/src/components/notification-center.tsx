"use client";

import * as React from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NotificationItem } from "./notification-bell";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ——————————————————————————————————————
// Types
// ——————————————————————————————————————

type FilterTab = "all" | "unread";

export interface NotificationCenterProps {
  notifications: NotificationItem[];
  /** Total de registros no banco (para paginação) */
  total: number;
  /** Indica se está carregando mais notificações */
  isLoadingMore: boolean;
  /** Indica se há mais páginas a carregar */
  hasMore: boolean;
  /** Callback para carregar mais */
  onLoadMore: () => void;
  /** Marca uma notificação como lida e navega para o destino */
  onRead: (id: string, href?: string) => void;
  /** Marca todas as visíveis como lidas */
  onMarkAllRead: () => void;
  className?: string;
}

// ——————————————————————————————————————
// Helpers
// ——————————————————————————————————————

function formatDate(createdAt: string): string {
  const date = new Date(createdAt);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);

  if (hours < 24) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function getHrefFromPayload(
  payload: Record<string, unknown> | null,
): string | undefined {
  if (!payload) return undefined;
  const href = payload["href"];
  return typeof href === "string" ? href : undefined;
}

// ——————————————————————————————————————
// NotificationRow
// ——————————————————————————————————————

interface NotificationRowProps {
  notification: NotificationItem;
  onRead: (id: string, href?: string) => void;
}

function NotificationRow({ notification: n, onRead }: NotificationRowProps) {
  const isUnread = n.readAt === null;
  const href = getHrefFromPayload(n.payload);

  return (
    <li>
      <button
        onClick={() => onRead(n.id, href)}
        className={cn(
          "relative w-full px-6 py-4 text-left",
          "border-b border-[--color-border] last:border-b-0",
          "transition-colors duration-[--transition-fast]",
          "hover:bg-[--color-muted] focus-visible:bg-[--color-muted]",
          "focus-visible:outline-none",
          isUnread && "bg-[--color-primary]/[0.04]",
        )}
        aria-label={
          isUnread
            ? `Notificação não lida: ${n.title}`
            : `Notificação: ${n.title}`
        }
      >
        {/* Unread dot */}
        {isUnread && (
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[--color-primary]"
          />
        )}

        <div className="flex items-start justify-between gap-4 pl-2">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[--text-sm] text-[--color-foreground]",
                isUnread
                  ? "font-[--font-weight-semibold]"
                  : "font-[--font-weight-normal]",
              )}
            >
              {n.title}
            </p>
            {n.body && (
              <p className="mt-1 line-clamp-3 text-[--text-sm] text-[--color-muted-foreground]">
                {n.body}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <time
              dateTime={n.createdAt}
              className="whitespace-nowrap text-[--text-xs] text-[--color-muted-foreground]"
            >
              {formatDate(n.createdAt)}
            </time>
            {!isUnread && (
              <Check
                className="h-3.5 w-3.5 text-[--color-muted-foreground] opacity-50"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

// ——————————————————————————————————————
// NotificationCenter
// ——————————————————————————————————————

export function NotificationCenter({
  notifications,
  total,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRead,
  onMarkAllRead,
  className,
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");

  const unreadCount = notifications.filter((n) => n.readAt === null).length;
  const displayed =
    activeTab === "unread"
      ? notifications.filter((n) => n.readAt === null)
      : notifications;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[--radius-lg] border border-[--color-border]",
        "bg-[--color-background] shadow-[--shadow-sm]",
        className,
      )}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[--color-border] px-6 py-4">
        <div className="flex items-center gap-3">
          <Bell
            className="h-5 w-5 text-[--color-muted-foreground]"
            aria-hidden="true"
          />
          <h1 className="text-[--text-base] font-[--font-weight-semibold] text-[--color-foreground]">
            Notificações
          </h1>
          {total > 0 && (
            <span className="text-[--text-xs] text-[--color-muted-foreground]">
              {total} no total
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className={cn(
              "flex items-center gap-1.5 rounded-[--radius] px-3 py-1.5",
              "text-[--text-xs] font-[--font-weight-medium] text-[--color-muted-foreground]",
              "border border-[--color-border]",
              "transition-colors duration-[--transition-fast]",
              "hover:border-[--color-primary] hover:text-[--color-primary]",
            )}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div
        className="flex gap-0 border-b border-[--color-border] px-6"
        role="tablist"
        aria-label="Filtros de notificação"
      >
        {(["all", "unread"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 py-3 pr-4 text-[--text-sm]",
              "transition-colors duration-[--transition-fast]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-1",
              activeTab === tab
                ? "border-[--color-primary] text-[--color-primary] font-[--font-weight-semibold]"
                : "border-transparent text-[--color-muted-foreground] hover:text-[--color-foreground]",
            )}
          >
            {tab === "all" ? "Todas" : "Não lidas"}
            {tab === "unread" && unreadCount > 0 && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1",
                  "text-[10px] font-[--font-weight-semibold] leading-none",
                  activeTab === "unread"
                    ? "bg-[--color-primary] text-white"
                    : "bg-[--color-muted] text-[--color-muted-foreground]",
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ─────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        aria-label={
          activeTab === "all"
            ? "Todas as notificações"
            : "Notificações não lidas"
        }
        className="flex-1 overflow-y-auto"
      >
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Bell
              className="h-10 w-10 text-[--color-muted-foreground] opacity-30"
              aria-hidden="true"
            />
            <p className="text-[--text-base] font-[--font-weight-medium] text-[--color-foreground]">
              {activeTab === "unread"
                ? "Tudo em dia"
                : "Nenhuma notificação ainda"}
            </p>
            <p className="max-w-xs text-[--text-sm] text-[--color-muted-foreground]">
              {activeTab === "unread"
                ? "Você não tem notificações não lidas."
                : '"Espera pelo Senhor; tem bom ânimo e ele fortalecerá o teu coração." — Sl 27.14'}
            </p>
          </div>
        ) : (
          <ul role="list" aria-label="Lista de notificações">
            {displayed.map((n) => (
              <NotificationRow key={n.id} notification={n} onRead={onRead} />
            ))}
          </ul>
        )}
      </div>

      {/* ── Load more ────────────────────────────────────────── */}
      {hasMore && activeTab === "all" && (
        <div className="border-t border-[--color-border] px-6 py-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-[--radius]",
              "border border-[--color-border] px-4 py-2",
              "text-[--text-sm] text-[--color-muted-foreground]",
              "transition-colors duration-[--transition-fast]",
              "hover:border-[--color-primary] hover:text-[--color-primary]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]",
            )}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Carregando…
              </>
            ) : (
              "Carregar mais"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
