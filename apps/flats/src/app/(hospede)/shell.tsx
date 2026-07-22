"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
import {
  Home,
  CalendarPlus,
  History,
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
    title: "Flats",
    items: [
      {
        label: "Catálogo",
        href: "/",
        icon: Home,
        exact: true,
      },
      {
        label: "Reservar",
        href: "/reservar",
        icon: CalendarPlus,
      },
      {
        label: "Minhas reservas",
        href: "/minhas-reservas",
        icon: History,
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

export default function HospedeShell({ user, children }: ShellProps) {
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
      appName="Flats"
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
