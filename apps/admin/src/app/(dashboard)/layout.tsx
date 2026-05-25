"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  ClipboardList,
  Settings,
  CalendarDays,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard, href: "/" },
  {
    key: "usuarios",
    label: "Usuários",
    icon: Users,
    href: "/usuarios",
    count: 3,
  },
  {
    key: "convites",
    label: "Convites",
    icon: Mail,
    href: "/convites",
    count: 4,
  },
  { key: "reunioes", label: "Reuniões", icon: CalendarDays, href: "/reunioes" },
  {
    key: "auditoria",
    label: "Auditoria",
    icon: ClipboardList,
    href: "/auditoria",
  },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: Settings,
    href: "/configuracoes",
  },
];

const APPS = [
  { key: "admin", label: "Admin" },
  { key: "projetos", label: "Projetos" },
  { key: "financeiro", label: "Financeiro" },
  { key: "plataforma", label: "Plataforma" },
  { key: "radio", label: "Rádio" },
  { key: "intranet", label: "Intranet" },
  { key: "docs", label: "Docs" },
  { key: "flats", label: "Flats" },
  { key: "tarefas", label: "Tarefas" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="hb-admin-shell">
      {/* ── Sidebar ── */}
      <aside className="hb-sidebar">
        <div className="hb-sidebar-brand">
          <div className="hb-sidebar-mark" aria-hidden="true">
            HA
          </div>
          <div className="hb-sidebar-brand-text">
            <span className="org">Hebron Aseec</span>
            <span className="module">Admin</span>
          </div>
        </div>

        <div className="hb-sidebar-section-label">Operação</div>

        <nav className="hb-sidebar-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`hb-nav-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
                {item.count && item.count > 0 ? (
                  <span className="hb-nav-count">{item.count}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hb-sidebar-apps">
          <div className="hb-sidebar-section-label" style={{ padding: 0 }}>
            Ecossistema
          </div>
          <div className="hb-sidebar-apps-grid">
            {APPS.map((app) => (
              <span
                key={app.key}
                className={`hb-app-tile${app.key === "admin" ? " current" : ""}`}
                title={`${app.label} · ${app.key}.hebronaseec.com.br`}
              >
                {app.label}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          minWidth: 0,
        }}
      >
        <div className="hb-main-content">{children}</div>
      </div>
    </div>
  );
}
