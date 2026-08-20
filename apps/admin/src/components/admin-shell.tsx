"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  getAppShortcuts,
  type NavSection,
  type ImpersonationBannerProps,
} from "@hebron/ui";
import {
  LayoutDashboard,
  Users,
  Mail,
  CalendarDays,
  ClipboardList,
  Settings,
  UserX,
} from "lucide-react";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../actions/notifications";

/** White rounded mark — the "HA" sigla used as the Admin icon mark. */
type Props = {
  children: React.ReactNode;
  userCount: number;
  pendingInvitesCount: number;
  impersonation?: ImpersonationBannerProps | null;
};

export function AdminShell({
  children,
  userCount,
  pendingInvitesCount,
  impersonation,
}: Props) {
  const path = usePathname();
  const router = useRouter();

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
        {
          label: "Exclusão de dados",
          href: "/lgpd",
          icon: UserX,
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
      apps={getAppShortcuts("admin")}
      user={{
        name: "Filipe Honório",
        email: "fcbfilipesantos@gmail.com",
      }}
      profileHref="/configuracoes"
      onLogout={() => {}}
      currentPath={path}
      appName="Admin"
      logo={<ModuleLogo module="admin" />}
      sidebarDark
      LinkComponent={Link}
      impersonation={impersonation}
      headerActions={
        <NotificationBellContainer
          currentAppId="admin"
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
