"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LucideIcon } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type LinkComponent = React.ForwardRefExoticComponent<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLAnchorElement>
>;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface AppShortcut {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface NavigationSidebarProps {
  sections: NavSection[];
  apps?: AppShortcut[];
  collapsed: boolean;
  currentPath?: string;
  onNavItemClick?: () => void;
  LinkComponent?: LinkComponent;
  className?: string;
  dark?: boolean;
}

const DefaultLink: LinkComponent = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(({ href, children, ...props }, ref) => (
  <a ref={ref} href={href} {...props}>
    {children}
  </a>
));
DefaultLink.displayName = "DefaultLink";

function isItemActive(
  href: string,
  currentPath: string,
  exact?: boolean,
): boolean {
  if (exact) return currentPath === href;
  return currentPath === href || currentPath.startsWith(href + "/");
}

interface NavTooltipProps {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}

function NavTooltip({ label, collapsed, children }: NavTooltipProps) {
  if (!collapsed) return <>{children}</>;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface NavItemButtonProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
  LinkComponent: LinkComponent;
  dark?: boolean;
}

function NavItemButton({
  item,
  collapsed,
  active,
  onClick,
  LinkComponent: Link,
  dark,
}: NavItemButtonProps) {
  const Icon = item.icon;

  return (
    <NavTooltip label={item.label} collapsed={collapsed}>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-label={
          collapsed
            ? item.badge !== undefined
              ? `${item.label}, ${item.badge}`
              : item.label
            : undefined
        }
        className={cn(
          "group flex items-center gap-2.5 rounded-(--radius) px-2.5 py-2.5",
          "text-sm transition-colors duration-(--transition-fast)",
          "focus-visible:outline-none focus-visible:ring-2",
          dark
            ? "focus-visible:ring-(--fg-invert)"
            : "focus-visible:ring-(--brand)",
          active
            ? dark
              ? "bg-white/20 font-(--font-weight-semibold) text-(--fg-invert)"
              : "bg-(--brand-muted) font-(--font-weight-semibold) text-(--brand)"
            : dark
              ? "text-(--fg-invert-muted) hover:bg-white/[8%] hover:text-(--fg-invert)"
              : "text-(--fg-muted) hover:bg-(--surface-alt) hover:text-(--fg)",
          collapsed && "justify-center px-2",
        )}
      >
        <span className="relative shrink-0">
          <Icon
            className={cn(
              "h-4 w-4 transition-colors duration-(--transition-fast)",
              active
                ? dark
                  ? "text-(--fg-invert)"
                  : "text-(--brand)"
                : dark
                  ? "text-(--fg-invert-muted) group-hover:text-(--fg-invert)"
                  : "text-(--fg-muted) group-hover:text-(--fg)",
            )}
            aria-hidden="true"
          />
          {collapsed && item.badge !== undefined && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                dark ? "bg-(--fg-invert)" : "bg-(--accent)",
              )}
              aria-hidden="true"
            />
          )}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>{" "}
            {item.badge !== undefined && (
              <span
                className={cn(
                  "ml-auto inline-flex h-5 min-w-5 items-center justify-center",
                  "rounded-full px-1.5 text-xs font-(--font-weight-medium)",
                  active
                    ? dark
                      ? "bg-white/25 text-(--fg-invert)"
                      : "bg-(--brand) text-(--brand-fg)"
                    : dark
                      ? "bg-white/10 text-(--fg-invert-muted)"
                      : "bg-(--hb-gray-100) text-(--fg-muted)",
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    </NavTooltip>
  );
}

interface AppShortcutTileProps {
  app: AppShortcut;
  LinkComponent: LinkComponent;
  dark?: boolean;
}

function AppShortcutTile({
  app,
  LinkComponent: Link,
  dark,
}: AppShortcutTileProps) {
  const Icon = app.icon;

  return (
    <Link
      href={app.href}
      aria-label={app.label}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-(--radius-xs) p-2",
        "transition-colors duration-(--transition-fast)",
        "focus-visible:outline-none focus-visible:ring-2",
        dark
          ? "focus-visible:ring-(--fg-invert)"
          : "focus-visible:ring-(--brand)",
        app.active
          ? dark
            ? "bg-white/15 text-(--fg-invert)"
            : "bg-(--brand-muted) text-(--brand)"
          : dark
            ? "text-(--fg-invert-muted) hover:bg-white/10 hover:text-(--fg-invert)"
            : "text-(--fg-muted) hover:bg-(--surface-alt) hover:text-(--fg)",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="w-full truncate text-center text-xs leading-none">
        {app.label}
      </span>
    </Link>
  );
}

export function NavigationSidebar({
  sections,
  apps,
  collapsed,
  currentPath = "",
  onNavItemClick,
  LinkComponent = DefaultLink,
  className,
  dark,
}: NavigationSidebarProps) {
  return (
    <TooltipProvider>
      <nav
        aria-label="Navegação principal"
        className={cn("flex h-full flex-col", className)}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={section.title ?? sectionIndex}>
              {sectionIndex > 0 && (
                <SeparatorPrimitive.Root
                  className={cn(
                    "mx-3 my-2 h-px",
                    dark ? "bg-white/10" : "bg-(--border)",
                  )}
                  aria-hidden="true"
                />
              )}

              {section.title && !collapsed && (
                <p
                  className={cn(
                    "mb-1.5 mt-1 px-3 text-xs font-(--font-weight-semibold)",
                    "uppercase tracking-wider",
                    dark ? "text-(--fg-invert-muted)" : "text-(--fg-muted)",
                  )}
                >
                  {section.title}
                </p>
              )}

              <ul className="space-y-0.5 px-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavItemButton
                      item={item}
                      collapsed={collapsed}
                      active={isItemActive(item.href, currentPath, item.exact)}
                      onClick={onNavItemClick}
                      LinkComponent={LinkComponent}
                      dark={dark}
                    />
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ))}
        </div>

        {apps && apps.length > 0 && !collapsed && (
          <div
            className={cn(
              "shrink-0 border-t px-3 py-3",
              dark ? "border-white/10" : "border-(--border)",
            )}
          >
            <div className="grid grid-cols-3 gap-1">
              {apps.map((app) => (
                <AppShortcutTile
                  key={app.id}
                  app={app}
                  LinkComponent={LinkComponent}
                  dark={dark}
                />
              ))}
            </div>
          </div>
        )}
      </nav>
    </TooltipProvider>
  );
}
