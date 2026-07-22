"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Megaphone,
  Users,
  CalendarDays,
  Handshake,
  Search,
} from "lucide-react";
import { AppShell, getAppShortcuts, type NavSection } from "@hebron/ui";
import { logoutAction } from "../../actions/auth";
import type { AuthUser } from "../../lib/queries";

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Painel",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Comunicação",
    items: [
      {
        label: "Anúncios",
        href: "/anuncios",
        icon: Megaphone,
      },
      {
        label: "Diretório",
        href: "/diretorio",
        icon: Users,
      },
    ],
  },
  {
    title: "Governança",
    items: [
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
      },
      {
        label: "Reuniões",
        href: "/reunioes",
        icon: Handshake,
      },
    ],
  },
  {
    items: [
      {
        label: "Busca",
        href: "/busca",
        icon: Search,
      },
    ],
  },
];

export interface IntranetShellProps {
  user: Pick<AuthUser, "fullName" | "email">;
  children: React.ReactNode;
}

export default function IntranetShell({ user, children }: IntranetShellProps) {
  const pathname = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      apps={getAppShortcuts("intranet")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={pathname}
      appName="Intranet"
      logo={
        <Home
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-cyan)" }}
        />
      }
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
