"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  CalendarDays,
  Handshake,
  Search,
} from "lucide-react";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  getAppShortcuts,
  type NavSection,
} from "@hebron/ui";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";
import type { AuthUser } from "../../lib/queries";

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Painel",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Comunicação",
    items: [
      {
        label: "Anúncios",
        href: "/anuncios",
        icon: Megaphone,
      },
      {
        label: "Diretório",
        href: "/diretorio",
        icon: Users,
      },
    ],
  },
  {
    title: "Governança",
    items: [
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
      },
      {
        label: "Reuniões",
        href: "/reunioes",
        icon: Handshake,
      },
    ],
  },
  {
    items: [
      {
        label: "Busca",
        href: "/busca",
        icon: Search,
      },
    ],
  },
];

export interface IntranetShellProps {
  user: Pick<AuthUser, "fullName" | "email">;
  children: React.ReactNode;
}

export default function IntranetShell({ user, children }: IntranetShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      apps={getAppShortcuts("intranet")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={pathname}
      appName="Intranet"
      logo={<ModuleLogo module="intranet" />}
      sidebarDark
      headerActions={
        <NotificationBellContainer
          currentAppId="intranet"
          centerHref="/notificacoes"
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
