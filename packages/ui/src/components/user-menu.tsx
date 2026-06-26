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

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const avatarSizes = {
  sm: "h-7 w-7 text-(--text-xs)",
  md: "h-9 w-9 text-(--text-sm)",
  lg: "h-12 w-12 text-(--text-base)",
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
          "inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-(--border)",
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
        "bg-(--brand) font-(--font-weight-semibold) text-(--brand-fg)",
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
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full pl-1 pr-2.5",
            "border border-(--border)",
            "text-(--text-sm) font-(--font-weight-medium)",
            "transition-colors duration-(--transition-fast)",
            open
              ? "bg-(--surface-alt)"
              : "bg-transparent hover:bg-(--surface-alt)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
            "select-none",
            className,
          )}
          aria-label="Menu do usuário"
        >
          <Avatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            size="sm"
            className="h-6 w-6 text-[10px]"
          />
          <span className="hidden max-w-28 truncate leading-none sm:block">
            {getFirstName(user.name)}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 text-(--fg-muted)",
              "transition-transform duration-(--transition-fast)",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={6}
          className={cn(
            "z-(--z-dropdown) w-56 overflow-hidden rounded-(--radius-md)",
            "border border-(--border) bg-(--bg)",
            "shadow-(--shadow-md)",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2",
          )}
        >
          {/* Identity header — tinted, no avatar (already visible in trigger) */}
          <div className="border-b border-(--border) bg-(--surface-alt) px-3.5 py-3">
            <p className="truncate text-(--text-sm) font-(--font-weight-semibold) leading-tight">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-(--text-xs) leading-tight text-(--fg-muted)">
              {user.email}
            </p>
          </div>

          <div className="py-1">
            <DropdownMenuPrimitive.Item asChild>
              <a
                href={profileHref}
                style={{ outline: "none" }}
                className={cn(
                  "mx-1 flex cursor-pointer items-center gap-2.5 rounded-(--radius-sm)",
                  "px-2.5 py-2 text-(--text-sm) text-(--fg)",
                  "transition-colors duration-(--transition-fast)",
                  "data-[highlighted]:bg-(--surface-alt)",
                )}
              >
                <User
                  className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)"
                  aria-hidden="true"
                />
                Meu perfil
              </a>
            </DropdownMenuPrimitive.Item>
          </div>

          <DropdownMenuPrimitive.Separator className="mx-1 h-px bg-(--border)" />

          <div className="py-1">
            <DropdownMenuPrimitive.Item
              onSelect={onLogout}
              style={{ outline: "none" }}
              className={cn(
                "mx-1 flex cursor-pointer items-center gap-2.5 rounded-(--radius-sm)",
                "px-2.5 py-2 text-(--text-sm)",
                "text-(--color-destructive)",
                "transition-colors duration-(--transition-fast)",
                "data-[highlighted]:bg-(--color-destructive-muted)",
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sair
            </DropdownMenuPrimitive.Item>
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
