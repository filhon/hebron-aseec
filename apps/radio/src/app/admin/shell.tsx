"use client";

import { usePathname } from "next/navigation";
import { AppShell, getAppShortcuts, type NavSection } from "@hebron/ui";
import { LayoutDashboard, Radio } from "lucide-react";
import { logoutAction } from "../../actions/auth";

const SECTIONS: NavSection[] = [
  {
    title: "Rádio",
    items: [
      {
        label: "Painel",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
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
      apps={getAppShortcuts("radio")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Rádio — Gestão"
      logo={
        <Radio
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
