"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import { LayoutDashboard, FolderPlus, Building2, FileText } from "lucide-react";
import { logoutAction } from "../../actions/auth";
import { ProjetosLogo } from "../../components/projetos-logo";

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

type Props = {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
};

export default function SubmissorShell({ user, children }: Props) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/instituicao"
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
