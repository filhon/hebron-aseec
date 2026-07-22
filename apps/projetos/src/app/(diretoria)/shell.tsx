"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Settings,
} from "lucide-react";
import { logoutAction } from "../../actions/auth";
import { ProjetosLogo } from "../../components/projetos-logo";

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Pipeline",
        href: "/pipeline",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Pauta da Reunião",
        href: "/reuniao",
        icon: CalendarDays,
      },
      {
        label: "Relatórios",
        href: "/relatorios-dir",
        icon: BarChart3,
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

type Props = {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
};

export default function DiretoriaShell({ user, children }: Props) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Projetos"
      logo={<ProjetosLogo />}
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
