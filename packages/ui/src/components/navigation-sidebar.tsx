"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LucideIcon } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ——————————————————————————————————————
// Types
// ——————————————————————————————————————

/** Componente de link polimórfico — aceita next/link ou <a> nativo */
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
  /** Se verdadeiro, só ativa quando o caminho é exato */
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
  /** Se este é o app atual */
  active?: boolean;
}

export interface NavigationSidebarProps {
  sections: NavSection[];
  apps?: AppShortcut[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  currentPath?: string;
  /** Oculta o botão de colapso (usado no drawer mobile) */
  showCollapseToggle?: boolean;
  /** Chamado ao clicar em um item de navegação (útil para fechar drawer mobile) */
  onNavItemClick?: () => void;
  /**
   * Componente de link a ser usado na navegação.
   * Passe `Link` do Next.js para soft navigation no App Router.
   * Se omitido, usa `<a>` nativo.
   */
  LinkComponent?: LinkComponent;
  className?: string;
}

// ——————————————————————————————————————
// Default link (plain anchor — funciona sem Next.js)
// ——————————————————————————————————————

const DefaultLink: LinkComponent = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(({ href, children, ...props }, ref) => (
  <a ref={ref} href={href} {...props}>
    {children}
  </a>
));
DefaultLink.displayName = "DefaultLink";

// ——————————————————————————————————————
// Helpers
// ——————————————————————————————————————

function isItemActive(
  href: string,
  currentPath: string,
  exact?: boolean,
): boolean {
  if (exact) return currentPath === href;
  return currentPath === href || currentPath.startsWith(href + "/");
}

// ——————————————————————————————————————
// Tooltip wrapper (exibe label quando sidebar está colapsada)
// ——————————————————————————————————————

interface NavTooltipProps {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}

function NavTooltip({ label, collapsed, children }: NavTooltipProps) {
  if (!collapsed) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          sideOffset={8}
          className={cn(
            "z-[--z-tooltip] rounded-[--radius] px-2.5 py-1.5",
            "bg-[--color-foreground] text-[--text-xs]",
            "shadow-[--shadow-md]",
            "animate-in fade-in-0 zoom-in-95",
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-[--color-foreground]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ——————————————————————————————————————
// Nav item
// ——————————————————————————————————————

interface NavItemButtonProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
  LinkComponent: LinkComponent;
}

function NavItemButton({
  item,
  collapsed,
  active,
  onClick,
  LinkComponent: Link,
}: NavItemButtonProps) {
  const Icon = item.icon;

  return (
    <NavTooltip label={item.label} collapsed={collapsed}>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-[--radius] px-2.5 py-2",
          "text-[--text-sm] font-[--font-weight-medium]",
          "transition-all duration-[--transition-fast]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]",
          active
            ? "bg-[--color-primary-muted] text-[--color-primary]"
            : "text-[--color-muted-foreground] hover:bg-[--color-muted] hover:text-[--color-foreground]",
          collapsed && "justify-center px-2",
        )}
      >
        <Icon
          className={cn(
            "shrink-0 transition-colors duration-[--transition-fast]",
            collapsed ? "h-5 w-5" : "h-4 w-4",
            active
              ? "text-[--color-primary]"
              : "text-[--color-muted-foreground] group-hover:text-[--color-foreground]",
          )}
          aria-hidden="true"
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "ml-auto inline-flex h-5 min-w-5 items-center justify-center",
                  "rounded-full px-1.5 text-[--text-xs] font-[--font-weight-medium]",
                  active
                    ? "bg-[--color-primary] text-[--color-primary-foreground]"
                    : "bg-[--color-subtle] text-[--color-muted-foreground]",
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

// ——————————————————————————————————————
// App launcher item
// ——————————————————————————————————————

interface AppShortcutButtonProps {
  app: AppShortcut;
  collapsed: boolean;
  LinkComponent: LinkComponent;
}

function AppShortcutButton({
  app,
  collapsed,
  LinkComponent: Link,
}: AppShortcutButtonProps) {
  const Icon = app.icon;

  return (
    <NavTooltip label={app.label} collapsed={collapsed}>
      <Link
        href={app.href}
        aria-label={app.label}
        className={cn(
          "group flex items-center gap-2.5 rounded-[--radius] px-2.5 py-1.5",
          "text-[--text-xs] font-[--font-weight-medium]",
          "transition-all duration-[--transition-fast]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]",
          app.active
            ? "bg-[--color-accent-muted] text-[--color-accent]"
            : "text-[--color-muted-foreground] hover:bg-[--color-muted] hover:text-[--color-foreground]",
          collapsed && "justify-center px-2",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            app.active
              ? "text-[--color-accent]"
              : "text-[--color-muted-foreground] group-hover:text-[--color-foreground]",
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">{app.label}</span>}
      </Link>
    </NavTooltip>
  );
}

// ——————————————————————————————————————
// NavigationSidebar
// ——————————————————————————————————————

export function NavigationSidebar({
  sections,
  apps,
  collapsed,
  onCollapsedChange,
  currentPath = "",
  showCollapseToggle = true,
  onNavItemClick,
  LinkComponent = DefaultLink,
  className,
}: NavigationSidebarProps) {
  const CollapseIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <TooltipPrimitive.Provider>
      <nav
        aria-label="Navegação principal"
        className={cn("flex h-full flex-col", className)}
      >
        {/* Collapse toggle */}
        {showCollapseToggle && (
          <div
            className={cn(
              "flex h-14 shrink-0 items-center border-b border-[--color-border] px-3",
              collapsed ? "justify-center" : "justify-end",
            )}
          >
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[--radius]",
                "text-[--color-muted-foreground] transition-colors duration-[--transition-fast]",
                "hover:bg-[--color-muted] hover:text-[--color-foreground]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]",
              )}
            >
              <CollapseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Navigation sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={section.title ?? sectionIndex}>
              {sectionIndex > 0 && (
                <SeparatorPrimitive.Root
                  className="mx-3 my-2 h-px bg-[--color-border]"
                  aria-hidden="true"
                />
              )}

              {section.title && !collapsed && (
                <p
                  className={cn(
                    "mb-1 px-3 text-[--text-xs] font-[--font-weight-semibold]",
                    "uppercase tracking-wider text-[--color-muted-foreground]",
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
                    />
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ))}
        </div>

        {/* App launcher */}
        {apps && apps.length > 0 && (
          <div className="shrink-0 border-t border-[--color-border] py-3">
            {!collapsed && (
              <div className="mb-1 flex items-center gap-1.5 px-3">
                <LayoutGrid
                  className="h-3.5 w-3.5 text-[--color-muted-foreground]"
                  aria-hidden="true"
                />
                <p className="text-[--text-xs] font-[--font-weight-semibold] uppercase tracking-wider">
                  Apps
                </p>
              </div>
            )}

            {collapsed && (
              <div className="mb-1 flex justify-center px-2">
                <NavTooltip label="Apps do ecossistema" collapsed={collapsed}>
                  <span className="flex h-7 w-7 items-center justify-center">
                    <LayoutGrid
                      className="h-4 w-4 text-[--color-muted-foreground]"
                      aria-hidden="true"
                    />
                  </span>
                </NavTooltip>
              </div>
            )}

            <ul className="space-y-0.5 px-2">
              {apps.map((app) => (
                <li key={app.id}>
                  <AppShortcutButton
                    app={app}
                    collapsed={collapsed}
                    LinkComponent={LinkComponent}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </TooltipPrimitive.Provider>
  );
}
