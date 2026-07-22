"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
import {
  LayoutDashboard,
  Settings,
  Briefcase,
  BadgeDollarSign,
  Home,
  BookOpen,
  Folder,
  BedDouble,
  CheckCircle,
  Radio,
} from "lucide-react";
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

const APPS: AppShortcut[] = [
  {
    id: "admin",
    label: "Admin",
    href: "https://admin.hebronaseec.com.br",
    icon: Settings,
  },
  {
    id: "projetos",
    label: "Projetos",
    href: "https://projetos.hebronaseec.com.br",
    icon: Briefcase,
  },
  {
    id: "financeiro",
    label: "Financeiro",
    href: "https://financeiro.hebronaseec.com.br",
    icon: BadgeDollarSign,
  },
  {
    id: "intranet",
    label: "Intranet",
    href: "https://app.hebronaseec.com.br",
    icon: Home,
  },
  {
    id: "plataforma",
    label: "Plataforma",
    href: "https://plataforma.hebronaseec.com.br",
    icon: BookOpen,
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "https://docs.hebronaseec.com.br",
    icon: Folder,
  },
  {
    id: "flats",
    label: "Flats",
    href: "https://flats.hebronaseec.com.br",
    icon: BedDouble,
  },
  {
    id: "tarefas",
    label: "Tarefas",
    href: "https://tarefas.hebronaseec.com.br",
    icon: CheckCircle,
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
      apps={APPS}
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
