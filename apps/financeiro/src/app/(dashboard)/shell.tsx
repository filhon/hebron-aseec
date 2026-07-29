"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  getAppShortcuts,
  type NavSection,
} from "@hebron/ui";
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
  Wallet,
  Building2,
  LineChart,
} from "lucide-react";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";

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

type ShellProps = {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
};

export default function FinanceiroShell({ user, children }: ShellProps) {
  const path = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      apps={getAppShortcuts("financeiro")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Financeiro"
      logo={<ModuleLogo module="financeiro" />}
      sidebarDark
      LinkComponent={Link}
      headerActions={
        <NotificationBellContainer
          currentAppId="financeiro"
          centerHref="/notificacoes"
          LinkComponent={Link}
          listNotifications={async () => {
            const result = await listBellNotifications({});
            if (!result?.data) {
              throw new Error("Falha ao carregar notificações");
            }
            return result.data;
          }}
          markRead={async (id) => {
            await markNotificationReadAction({ id });
          }}
          markAllRead={async () => {
            await markAllNotificationsReadAction({});
          }}
          navigate={(href) => router.push(href)}
        />
      }
    >
      {children}
    </AppShell>
  );
}
