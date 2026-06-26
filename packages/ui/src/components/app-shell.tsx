"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
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

export interface AppShellProps {
  children: React.ReactNode;
  sections: NavSection[];
  apps?: AppShortcut[];
  user: UserMenuUser;
  profileHref: string;
  onLogout: () => void;
  currentPath?: string;
  logo?: React.ReactNode;
  /** Module name shown in the sidebar brand area (e.g. "Admin", "Financeiro") */
  appName?: string;
  /** Organisation name shown above the module name. Defaults to "Hebron Aseec" */
  orgName?: string;
  LinkComponent?: LinkComponent;
  className?: string;
  sidebarDark?: boolean;
}

// ── Brand row shown inside the sidebar ────────────────────────────────────────

interface SidebarBrandProps {
  logo?: React.ReactNode;
  appName?: string;
  orgName?: string;
  collapsed: boolean;
  dark?: boolean;
}

function SidebarBrand({
  logo,
  appName,
  orgName = "Hebron Aseec",
  collapsed,
  dark,
}: SidebarBrandProps) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b",
        dark ? "border-white/10" : "border-(--border)",
        collapsed ? "justify-center px-2" : "gap-3 px-4 pr-10",
      )}
    >
      {/* Logo mark */}
      {logo && <span className="shrink-0">{logo}</span>}

      {/* 2-line brand text — hidden when collapsed */}
      {!collapsed && (appName ?? orgName) && (
        <div className="flex min-w-0 flex-1 flex-col gap-0 leading-none">
          <span
            className={cn(
              "truncate font-(--font-display) font-(--font-weight-semibold) uppercase",
              dark ? "text-white/45" : "text-(--fg-muted)",
            )}
            style={{ fontSize: "9.5px", letterSpacing: "0.1em" }}
          >
            {orgName}
          </span>
          {appName && (
            <span
              className={cn(
                "truncate font-(--font-display) font-(--font-weight-bold)",
                dark ? "text-white" : "text-(--fg)",
              )}
              style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
            >
              {appName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mobile sidebar drawer ──────────────────────────────────────────────────────

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: NavSection[];
  apps?: AppShortcut[];
  currentPath?: string;
  logo?: React.ReactNode;
  appName?: string;
  orgName?: string;
  LinkComponent?: LinkComponent;
  dark?: boolean;
}

function MobileSidebar({
  open,
  onOpenChange,
  sections,
  apps,
  currentPath,
  logo,
  appName,
  orgName,
  LinkComponent,
  dark,
}: MobileSidebarProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-(--z-overlay) bg-black/40 backdrop-blur-[2px]",
            "lg:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "duration-(--transition-medium)",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-(--z-modal) w-64",
            dark
              ? "border-r border-white/10 bg-(--hb-blue)"
              : "border-r border-(--border) bg-(--bg)",
            "shadow-(--shadow-xl)",
            "lg:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "duration-(--transition-medium)",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Menu de navegação
          </DialogPrimitive.Title>

          {/* Brand row in mobile drawer (no collapse button) */}
          {(logo ?? appName) && (
            <div
              className={cn(
                "flex h-14 items-center gap-3 border-b px-4",
                dark ? "border-white/10" : "border-(--border)",
              )}
            >
              {logo && <span className="shrink-0">{logo}</span>}
              {appName && (
                <div className="flex min-w-0 flex-1 flex-col gap-0 leading-none">
                  {orgName && (
                    <span
                      className={cn(
                        "truncate font-(--font-display) font-(--font-weight-semibold) uppercase",
                        dark ? "text-white/45" : "text-(--fg-muted)",
                      )}
                      style={{ fontSize: "9.5px", letterSpacing: "0.1em" }}
                    >
                      {orgName ?? "Hebron Aseec"}
                    </span>
                  )}
                  <span
                    className={cn(
                      "truncate font-(--font-display) font-(--font-weight-bold)",
                      dark ? "text-white" : "text-(--fg)",
                    )}
                    style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
                  >
                    {appName}
                  </span>
                </div>
              )}
            </div>
          )}

          <NavigationSidebar
            sections={sections}
            apps={apps}
            collapsed={false}
            onCollapsedChange={() => undefined}
            currentPath={currentPath}
            onNavItemClick={() => onOpenChange(false)}
            LinkComponent={LinkComponent}
            dark={dark}
            className={(logo ?? appName) ? "h-[calc(100%-3.5rem)]" : "h-full"}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── AppShell ───────────────────────────────────────────────────────────────────

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
  orgName = "Hebron Aseec",
  LinkComponent,
  className,
  sidebarDark,
}: AppShellProps) {
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className={cn("min-h-screen bg-(--bg)", className)}>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-(--z-sticky)",
          "hidden lg:flex flex-col",
          sidebarDark
            ? "border-r border-white/10 bg-(--hb-blue)"
            : "border-r border-(--border) bg-(--bg)",
          "transition-[width] duration-(--transition-medium)",
          desktopCollapsed ? "w-16" : "w-64",
        )}
        aria-label="Barra lateral de navegação"
      >
        <SidebarBrand
          logo={logo}
          appName={appName}
          orgName={orgName}
          collapsed={desktopCollapsed}
          dark={sidebarDark}
        />

        {/* Collapse toggle — tab on the right edge, vertically centered in brand bar */}
        <button
          onClick={() => setDesktopCollapsed((v) => !v)}
          aria-label={desktopCollapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "absolute right-0 top-0 flex h-14 w-8 items-center justify-center",
            sidebarDark
              ? "text-white/35 hover:text-white/70"
              : "text-(--fg-muted) hover:text-(--fg)",
            "transition-colors duration-(--transition-fast)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
          )}
        >
          {desktopCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        <NavigationSidebar
          sections={sections}
          apps={apps}
          collapsed={desktopCollapsed}
          onCollapsedChange={setDesktopCollapsed}
          currentPath={currentPath}
          LinkComponent={LinkComponent}
          dark={sidebarDark}
          className="h-[calc(100%-3.5rem)]"
        />
      </aside>

      {/* ── Mobile drawer ── */}
      <MobileSidebar
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        sections={sections}
        apps={apps}
        currentPath={currentPath}
        logo={logo}
        appName={appName}
        orgName={orgName}
        LinkComponent={LinkComponent}
        dark={sidebarDark}
      />

      {/* ── Top header ── */}
      <header
        className={cn(
          "fixed right-0 top-0 z-(--z-sticky) h-14",
          "flex items-center gap-3 border-b border-(--border)",
          "bg-(--bg)/95 px-4 backdrop-blur-sm",
          "transition-[left] duration-(--transition-medium)",
          "left-0",
          desktopCollapsed ? "lg:left-16" : "lg:left-64",
        )}
      >
        {/* Mobile: hamburger + brand */}
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-(--radius) lg:hidden",
            "text-(--fg) transition-colors duration-(--transition-fast)",
            "hover:bg-(--surface-alt)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
          )}
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {appName && (
          <span className="text-(--text-sm) font-(--font-weight-semibold) lg:hidden">
            {appName}
          </span>
        )}

        <div className="flex-1" />

        <UserMenu user={user} profileHref={profileHref} onLogout={onLogout} />
      </header>

      {/* ── Content ── */}
      <main
        className={cn(
          "pt-14 transition-[margin-left] duration-(--transition-medium)",
          "ml-0",
          desktopCollapsed ? "lg:ml-16" : "lg:ml-64",
        )}
      >
        {children}
      </main>
    </div>
  );
}
