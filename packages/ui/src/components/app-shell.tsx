"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  NavigationSidebar,
  type NavSection,
  type AppShortcut,
  type LinkComponent,
} from "./navigation-sidebar";
import { UserMenu, type UserMenuUser } from "./user-menu";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ——————————————————————————————————————
// Types
// ——————————————————————————————————————

export interface AppShellProps {
  children: React.ReactNode;
  /** Seções de navegação da sidebar */
  sections: NavSection[];
  /** Atalhos para outros apps do ecossistema */
  apps?: AppShortcut[];
  /** Dados do usuário autenticado */
  user: UserMenuUser;
  /** Href da página de perfil do usuário */
  profileHref: string;
  /** Callback para logout */
  onLogout: () => void;
  /** Caminho atual (para destacar item ativo na sidebar) */
  currentPath?: string;
  /** Logo ou ícone do app (renderizado no topo da sidebar e no topbar mobile) */
  logo?: React.ReactNode;
  /** Nome do app exibido no topbar */
  appName?: string;
  /**
   * Componente de link para soft navigation.
   * Passe `Link` do Next.js. Se omitido, usa `<a>` nativo.
   */
  LinkComponent?: LinkComponent;
  className?: string;
}

// ——————————————————————————————————————
// Mobile sidebar drawer
// ——————————————————————————————————————

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: NavSection[];
  apps?: AppShortcut[];
  currentPath?: string;
  logo?: React.ReactNode;
  LinkComponent?: LinkComponent;
}

function MobileSidebar({
  open,
  onOpenChange,
  sections,
  apps,
  currentPath,
  logo,
  LinkComponent,
}: MobileSidebarProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[--z-overlay] bg-black/40 backdrop-blur-[2px]",
            "lg:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "duration-[--transition-medium]",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-[--z-modal] w-64",
            "border-r border-[--color-border] bg-[--color-background]",
            "shadow-[--shadow-xl]",
            "lg:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "duration-[--transition-medium]",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Menu de navegação
          </DialogPrimitive.Title>

          {/* Logo header inside mobile drawer */}
          {logo && (
            <div className="flex h-14 items-center border-b border-[--color-border] px-4">
              {logo}
            </div>
          )}

          <div className={cn("h-full", logo ? "pt-0" : "")}>
            <NavigationSidebar
              sections={sections}
              apps={apps}
              collapsed={false}
              onCollapsedChange={() => undefined}
              currentPath={currentPath}
              showCollapseToggle={false}
              onNavItemClick={() => onOpenChange(false)}
              LinkComponent={LinkComponent}
              className={logo ? "h-[calc(100%-3.5rem)]" : "h-full"}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ——————————————————————————————————————
// AppShell
// ——————————————————————————————————————

export function AppShell({
  children,
  sections,
  apps,
  user,
  profileHref,
  onLogout,
  currentPath,
  logo,
  appName,
  LinkComponent,
  className,
}: AppShellProps) {
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className={cn("min-h-screen bg-[--color-background]", className)}>
      {/* ── Desktop sidebar (lg+) ────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[--z-sticky]",
          "hidden lg:flex flex-col",
          "border-r border-[--color-border] bg-[--color-background]",
          "transition-[width] duration-[--transition-medium]",
          desktopCollapsed ? "w-16" : "w-64",
        )}
        aria-label="Barra lateral de navegação"
      >
        {/* Logo header */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-[--color-border]",
            desktopCollapsed ? "justify-center px-3" : "px-4",
          )}
        >
          {logo}
          {!desktopCollapsed && appName && (
            <span className="ml-2 truncate text-[--text-sm] font-[--font-weight-semibold]">
              {appName}
            </span>
          )}
        </div>

        <NavigationSidebar
          sections={sections}
          apps={apps}
          collapsed={desktopCollapsed}
          onCollapsedChange={setDesktopCollapsed}
          currentPath={currentPath}
          showCollapseToggle={true}
          LinkComponent={LinkComponent}
          className="h-[calc(100%-3.5rem)]"
        />
      </aside>

      {/* ── Mobile sidebar drawer ────────────────────────────── */}
      <MobileSidebar
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        sections={sections}
        apps={apps}
        currentPath={currentPath}
        logo={logo}
        LinkComponent={LinkComponent}
      />

      {/* ── Topbar ──────────────────────────────────────────── */}
      <header
        className={cn(
          "fixed right-0 top-0 z-[--z-sticky] h-14",
          "flex items-center gap-3 border-b border-[--color-border]",
          "bg-[--color-background]/95 px-4 backdrop-blur-sm",
          "transition-[left] duration-[--transition-medium]",
          "left-0",
          desktopCollapsed ? "lg:left-16" : "lg:left-64",
        )}
      >
        {/* Mobile hamburger */}
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[--radius] lg:hidden",
            "text-[--color-foreground] transition-colors duration-[--transition-fast]",
            "hover:bg-[--color-muted]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]",
          )}
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Mobile: logo + app name */}
        {(logo || appName) && (
          <div className="flex items-center gap-2 lg:hidden">
            {logo}
            {appName && (
              <span className="text-[--text-sm] font-[--font-weight-semibold]">
                {appName}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        <UserMenu user={user} profileHref={profileHref} onLogout={onLogout} />
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main
        className={cn(
          "pt-14 transition-[margin-left] duration-[--transition-medium]",
          "ml-0",
          desktopCollapsed ? "lg:ml-16" : "lg:ml-64",
        )}
      >
        {children}
      </main>
    </div>
  );
}
