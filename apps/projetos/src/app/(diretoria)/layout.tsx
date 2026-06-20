"use client";

import { usePathname } from "next/navigation";
import { AppShell, BrandMark, type NavSection } from "@hebron/ui";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Settings,
} from "lucide-react";

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Pipeline",
        href: "/",
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

const MOCK_USER = {
  name: "Dir. Fábio Ribeiro",
  email: "fabio.ribeiro@hebronaseec.com.br",
};

export default function DiretoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      user={MOCK_USER}
      profileHref="/configuracoes"
      onLogout={() => undefined}
      currentPath={path}
      appName="Projetos"
      logo={<BrandMark showName={false} />}
    >
      {children}
    </AppShell>
  );
}
