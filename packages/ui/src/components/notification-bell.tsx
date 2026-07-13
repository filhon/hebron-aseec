"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Bell, Check, CheckCheck } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationBellProps {
  notifications: NotificationItem[];
  unreadCount: number;
  centerHref: string;
  onRead: (id: string, href?: string) => void;
  onMarkAllRead: () => void;
  className?: string;
}

function formatRelativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 30) return `${days}d`;
  return new Date(createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function getHrefFromPayload(
  payload: Record<string, unknown> | null,
): string | undefined {
  if (!payload) return undefined;
  const href = payload["href"];
  return typeof href === "string" ? href : undefined;
}

export function NotificationBell({
  notifications,
  unreadCount,
  centerHref,
  onRead,
  onMarkAllRead,
  className,
}: NotificationBellProps) {
  const displayed = notifications.slice(0, 10);
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-(--radius)",
            "text-(--fg-muted) transition-colors duration-(--transition-fast)",
            "hover:bg-(--surface-alt) hover:text-(--fg)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
            className,
          )}
          aria-label={
            hasUnread ? `${unreadCount} notificações não lidas` : "Notificações"
          }
        >
          <Bell className="h-5 w-5" aria-hidden="true" />

          {hasUnread && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center",
                "rounded-full bg-(--accent) px-1",
                "text-xs font-(--font-weight-semibold) leading-none text-white",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-(--z-dropdown) w-90 max-w-[calc(100vw-2rem)] rounded-(--radius-md)",
            "border border-(--border) bg-(--bg)",
            "shadow-(--shadow-lg)",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2",
          )}
        >
          <div className="flex items-center justify-between border-b border-(--border) px-4 py-3">
            <h2 className="text-sm font-(--font-weight-semibold)">
              Notificações
            </h2>
            {hasUnread && (
              <button
                onClick={onMarkAllRead}
                className={cn(
                  "flex items-center gap-1 rounded-(--radius-sm) px-2 py-1",
                  "text-xs",
                  "transition-colors duration-(--transition-fast)",
                  "hover:bg-(--surface-alt) hover:text-(--fg)",
                )}
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-105 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell
                  className="h-8 w-8 text-(--fg-muted) opacity-40"
                  aria-hidden="true"
                />
                <p className="text-sm">Nenhuma notificação</p>
                <p className="text-xs text-(--fg-muted)">
                  “Espera pelo Senhor; tem bom ânimo.” — Sl 27.14
                </p>
              </div>
            ) : (
              <ul role="list">
                {displayed.map((n) => {
                  const href = getHrefFromPayload(n.payload);
                  const isUnread = n.readAt === null;
                  return (
                    <li key={n.id}>
                      <DropdownMenuPrimitive.Item asChild>
                        <button
                          onClick={() => onRead(n.id, href)}
                          className={cn(
                            "relative w-full px-4 py-3 text-left",
                            "transition-colors duration-(--transition-fast)",
                            "hover:bg-(--surface-alt) focus:bg-(--surface-alt)",
                            "outline-none border-b border-(--border) last:border-b-0",
                            isUnread && "bg-(--brand)/4",
                          )}
                        >
                          {isUnread && (
                            <span
                              aria-hidden="true"
                              className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-(--brand)"
                            />
                          )}

                          <div className="pl-2">
                            <p
                              className={cn(
                                "truncate text-sm",
                                isUnread && "font-(--font-weight-semibold)",
                              )}
                            >
                              <span className="sr-only">
                                {isUnread ? "Não lida: " : "Lida: "}
                              </span>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="mt-0.5 line-clamp-2 text-xs">
                                {n.body}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-(--fg-muted)">
                              <time dateTime={n.createdAt}>
                                {formatRelativeTime(n.createdAt)}
                              </time>
                            </p>
                          </div>

                          {!isUnread && (
                            <Check
                              className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--fg-muted) opacity-40"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </DropdownMenuPrimitive.Item>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-(--border) px-4 py-2.5">
            <a
              href={centerHref}
              className={cn(
                "block w-full text-center text-xs",
                "text-(--brand) transition-colors duration-(--transition-fast)",
                "hover:underline focus-visible:outline-none focus-visible:underline",
              )}
            >
              Ver todas as notificações
            </a>
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
