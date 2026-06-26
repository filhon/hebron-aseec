"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection, type AppShortcut } from "@hebron/ui";
import {
  LayoutDashboard,
  List,
  Receipt,
  RefreshCcw,
  BarChart3,
  Layers,
  Upload,
  PieChart,
  FolderOpen,
  Settings,
  Home,
  Radio,
  Folder,
  BookOpen,
  Briefcase,
  CheckCircle,
  BadgeDollarSign,
} from "lucide-react";

const SECTIONS: NavSection[] = [
  {
    title: "Operação",
    items: [
      {
        label: "Painel",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Lançamentos",
        href: "/lancamentos",
        icon: List,
      },
      {
        label: "Contas a pagar",
        href: "/contas-pagar",
        icon: Receipt,
        badge: 4,
      },
      {
        label: "Conciliação",
        href: "/conciliacao",
        icon: RefreshCcw,
        badge: 2,
      },
      {
        label: "Orçamento",
        href: "/orcamento",
        icon: BarChart3,
      },
      {
        label: "Plano de contas",
        href: "/plano-contas",
        icon: Layers,
      },
      {
        label: "Importação",
        href: "/importacao",
        icon: Upload,
      },
    ],
  },
  {
    title: "Relatórios",
    items: [
      {
        label: "Demonstrativos",
        href: "/relatorios",
        icon: PieChart,
      },
      {
        label: "Centros de custo",
        href: "/centros-custo",
        icon: FolderOpen,
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

type ShellProps = {
  children: React.ReactNode;
};

export default function FinanceiroShell({ children }: ShellProps) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      apps={APPS}
      user={{
        name: "Filipe Honório",
        email: "fcbfilipesantos@gmail.com",
      }}
      profileHref="/configuracoes"
      onLogout={() => {}}
      currentPath={path}
      appName="Financeiro"
      logo={
        <BadgeDollarSign
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-green)" }}
        />
      }
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
