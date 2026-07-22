"use client";

import { usePathname } from "next/navigation";
import { AppShell, getAppShortcuts, type NavSection } from "@hebron/ui";
import { CalendarDays, ClipboardCheck, BedDouble } from "lucide-react";
import { logoutAction } from "../../actions/auth";

const SECTIONS: NavSection[] = [
  {
    title: "Gestão de flats",
    items: [
      {
        label: "Calendário",
        href: "/admin",
        icon: CalendarDays,
        exact: true,
      },
      {
        label: "Fila de aprovação",
        href: "/admin/aprovacao",
        icon: ClipboardCheck,
      },
    ],
  },
];

interface ShellProps {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: ShellProps) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      apps={getAppShortcuts("flats")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Flats — Gestão"
      logo={
        <BedDouble
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
