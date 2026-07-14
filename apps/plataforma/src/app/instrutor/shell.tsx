"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import { BookOpen, LayoutDashboard, Plus } from "lucide-react";
import { logoutAction } from "../../actions/auth";

const SECTIONS: NavSection[] = [
  {
    title: "Ensino",
    items: [
      {
        label: "Painel",
        href: "/instrutor",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Novo curso",
        href: "/instrutor/curso/novo",
        icon: Plus,
      },
    ],
  },
];

interface InstrutorShellProps {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
}

export default function InstrutorShell({
  user,
  children,
}: InstrutorShellProps) {
  const pathname = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/perfil"
      onLogout={() => void logoutAction()}
      currentPath={pathname}
      appName="Plataforma — Instrutor"
      logo={
        <BookOpen
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-cyan)" }}
          aria-hidden="true"
        />
      }
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
