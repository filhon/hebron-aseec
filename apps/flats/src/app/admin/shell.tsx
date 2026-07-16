"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
import {
  Home,
  CalendarDays,
  ClipboardCheck,
  Settings,
  Briefcase,
  BadgeDollarSign,
  BookOpen,
  Radio,
  Folder,
  CheckCircle,
  BedDouble,
} from "lucide-react";
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
    id: "radio",
    label: "Rádio",
    href: "https://radio.hebronaseec.com.br",
    icon: Radio,
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "https://docs.hebronaseec.com.br",
    icon: Folder,
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
      profileHref="/"
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
