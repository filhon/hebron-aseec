"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
import {
  LayoutDashboard,
  Users,
  Mail,
  CalendarDays,
  ClipboardList,
  Settings,
  DollarSign,
  FolderOpen,
  Home,
  BookOpen,
  Radio,
  Folder,
  CheckCircle,
} from "lucide-react";

/** White rounded mark — the "HA" sigla used as the Admin icon mark. */
function AdminMark() {
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "var(--hb-white)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 12,
        color: "var(--hb-blue)",
        letterSpacing: "-0.02em",
        userSelect: "none",
      }}
      aria-hidden="true"
    >
      HA
    </span>
  );
}

const APPS: AppShortcut[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    href: "https://financeiro.hebronaseec.com.br",
    icon: DollarSign,
  },
  {
    id: "projetos",
    label: "Projetos",
    href: "https://projetos.hebronaseec.com.br",
    icon: FolderOpen,
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

type Props = {
  children: React.ReactNode;
  userCount: number;
  pendingInvitesCount: number;
};

export function AdminShell({
  children,
  userCount,
  pendingInvitesCount,
}: Props) {
  const path = usePathname();

  const sections: NavSection[] = [
    {
      title: "Operação",
      items: [
        {
          label: "Visão geral",
          href: "/",
          icon: LayoutDashboard,
          exact: true,
        },
        {
          label: "Usuários",
          href: "/usuarios",
          icon: Users,
          badge: userCount > 0 ? userCount : undefined,
        },
        {
          label: "Convites",
          href: "/convites",
          icon: Mail,
          badge: pendingInvitesCount > 0 ? pendingInvitesCount : undefined,
        },
        {
          label: "Reuniões",
          href: "/reunioes",
          icon: CalendarDays,
        },
        {
          label: "Auditoria",
          href: "/auditoria",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          label: "Configurações",
          href: "/configuracoes",
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <AppShell
      sections={sections}
      apps={APPS}
      user={{
        name: "Filipe Honório",
        email: "fcbfilipesantos@gmail.com",
      }}
      profileHref="/configuracoes"
      onLogout={() => {}}
      currentPath={path}
      appName="Admin"
      logo={<AdminMark />}
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
