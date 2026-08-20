"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  type NavSection,
  type ImpersonationBannerProps,
} from "@hebron/ui";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Building2,
  Settings,
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
      {
        label: "Instituições",
        href: "/instituicoes",
        icon: Building2,
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
  impersonation?: ImpersonationBannerProps | null;
  children: React.ReactNode;
};

export default function DiretoriaShell({
  user,
  impersonation,
  children,
}: Props) {
  const path = usePathname();
  const router = useRouter();

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
      logo={<ModuleLogo module="projetos" />}
      sidebarDark
      LinkComponent={Link}
      impersonation={impersonation}
      headerActions={
        <NotificationBellContainer
          currentAppId="projetos"
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
