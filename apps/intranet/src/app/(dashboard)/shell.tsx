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
  Settings,
  FolderOpen,
  BookOpen,
  Radio,
  DollarSign,
  Folder,
  Building2,
  CheckCircle,
} from "lucide-react";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
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
    icon: FolderOpen,
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
    id: "financeiro",
    label: "Financeiro",
    href: "https://financeiro.hebronaseec.com.br",
    icon: DollarSign,
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
    icon: Building2,
  },
  {
    id: "tarefas",
    label: "Tarefas",
    href: "https://tarefas.hebronaseec.com.br",
    icon: CheckCircle,
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
      apps={APPS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/perfil"
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
