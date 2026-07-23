"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  getAppShortcuts,
  NotificationBellContainer,
  type NavSection,
} from "@hebron/ui";
import { LayoutDashboard, Radio } from "lucide-react";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";

const SECTIONS: NavSection[] = [
  {
    title: "Rádio",
    items: [
      {
        label: "Painel",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
];

interface ShellProps {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: ShellProps) {
  const path = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      apps={getAppShortcuts("radio")}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Rádio — Gestão"
      logo={
        <Radio
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-cyan)" }}
        />
      }
      sidebarDark
      headerActions={
        <NotificationBellContainer
          currentAppId="radio"
          centerHref="/admin/notificacoes"
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
