"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const avatarSizes = {
  sm: "h-7 w-7 text-[--text-xs]",
  md: "h-9 w-9 text-[--text-sm]",
  lg: "h-12 w-12 text-[--text-base]",
} as const;

export function Avatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: AvatarProps) {
  const initials = getInitials(name);

  if (avatarUrl) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-[--border]",
          avatarSizes[size],
          className,
        )}
      >
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full",
        "bg-[--brand] font-[--font-weight-semibold] text-[--brand-fg]",
        "ring-1 ring-[--border]",
        avatarSizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}

export interface UserMenuUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface UserMenuProps {
  user: UserMenuUser;
  profileHref: string;
  onLogout: () => void;
  className?: string;
}

export function UserMenu({
  user,
  profileHref,
  onLogout,
  className,
}: UserMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-[--radius] px-2 py-1.5",
            "text-[--text-sm]",
            "transition-colors duration-[--transition-fast] hover:bg-[--surface-alt]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]",
            "select-none",
            className,
          )}
          aria-label="Menu do usuário"
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <span className="hidden max-w-35 truncate font-[--font-weight-medium] sm:block">
            {user.name}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 text-[--fg-muted]"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={6}
          className={cn(
            "z-[--z-dropdown] min-w-50 rounded-[--radius-md]",
            "border border-[--border] bg-[--bg]",
            "shadow-[--shadow-md] py-1",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2",
          )}
        >
          <div className="border-b border-[--border] px-3 py-2.5">
            <p className="truncate text-[--text-sm] font-[--font-weight-medium]">
              {user.name}
            </p>
            <p className="truncate text-[--text-xs]">{user.email}</p>
          </div>

          <DropdownMenuPrimitive.Item asChild>
            <a
              href={profileHref}
              className={cn(
                "mx-1 mt-1 flex cursor-pointer items-center gap-2 rounded-[--radius-sm]",
                "px-2.5 py-2 text-[--text-sm]",
                "outline-none transition-colors duration-[--transition-fast]",
                "hover:bg-[--surface-alt] focus:bg-[--surface-alt]",
              )}
            >
              <User className="h-4 w-4 text-[--fg-muted]" aria-hidden="true" />
              Meu perfil
            </a>
          </DropdownMenuPrimitive.Item>

          <DropdownMenuPrimitive.Separator className="mx-1 my-1 h-px bg-[--border]" />

          <DropdownMenuPrimitive.Item
            onSelect={onLogout}
            className={cn(
              "mx-1 mb-1 flex cursor-pointer items-center gap-2 rounded-[--radius-sm]",
              "px-2.5 py-2 text-[--text-sm]",
              "outline-none transition-colors duration-[--transition-fast]",
              "hover:bg-[--color-destructive-muted] focus:bg-[--color-destructive-muted]",
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
