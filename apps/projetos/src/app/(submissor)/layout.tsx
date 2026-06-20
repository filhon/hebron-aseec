"use client";

import { usePathname } from "next/navigation";
import { AppShell, BrandMark, type NavSection } from "@hebron/ui";
import { LayoutDashboard, FolderPlus, Building2, FileText } from "lucide-react";

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Meus Projetos",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
      { label: "Novo Projeto", href: "/novo", icon: FolderPlus },
      { label: "Relatórios", href: "/relatorios", icon: FileText },
      { label: "Minha Instituição", href: "/instituicao", icon: Building2 },
    ],
  },
];

const MOCK_USER = {
  name: "Pr. André Costa",
  email: "andre.costa@sementes.mz",
};

export default function SubmissorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      user={MOCK_USER}
      profileHref="/instituicao"
      onLogout={() => undefined}
      currentPath={path}
      appName="Projetos"
      logo={<BrandMark showName={false} />}
    >
      {children}
    </AppShell>
  );
}
