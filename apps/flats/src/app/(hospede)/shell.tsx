"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  type NavSection,
} from "@hebron/ui";
import { Home, CalendarPlus, History } from "lucide-react";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";

const SECTIONS: NavSection[] = [
  {
    title: "Flats",
    items: [
      {
        label: "Catálogo",
        href: "/",
        icon: Home,
        exact: true,
      },
      {
        label: "Reservar",
        href: "/reservar",
        icon: CalendarPlus,
      },
      {
        label: "Minhas reservas",
        href: "/minhas-reservas",
        icon: History,
      },
    ],
  },
];

interface ShellProps {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
}

export default function HospedeShell({ user, children }: ShellProps) {
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
      appName="Flats"
      logo={<ModuleLogo module="flats" />}
      sidebarDark
      headerActions={
        <NotificationBellContainer
          currentAppId="flats"
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
