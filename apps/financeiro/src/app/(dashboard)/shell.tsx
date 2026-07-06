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
  Building2,
  Wallet,
  LineChart,
} from "lucide-react";
import { FinanceiroLogo } from "../../components/financeiro-logo";
import { logoutAction } from "../../actions/auth";

const SECTIONS: NavSection[] = [
  {
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
      },
      {
        label: "Contas a receber",
        href: "/contas-receber",
        icon: Wallet,
      },
      {
        label: "Conciliação",
        href: "/conciliacao",
        icon: RefreshCcw,
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
    items: [
      {
        label: "Fluxo de caixa",
        href: "/fluxo-caixa",
        icon: LineChart,
      },
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
      {
        label: "Orçamento por instituição",
        href: "/orcamento-organizacoes",
        icon: Building2,
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
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
};

export default function FinanceiroShell({ user, children }: ShellProps) {
  const path = usePathname();

  return (
    <AppShell
      sections={SECTIONS}
      apps={APPS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/configuracoes"
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Financeiro"
      logo={<FinanceiroLogo />}
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
