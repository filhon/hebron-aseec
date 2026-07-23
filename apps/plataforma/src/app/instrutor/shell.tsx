"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  NotificationBellContainer,
  type NavSection,
} from "@hebron/ui";
import { BookOpen, LayoutDashboard, Plus } from "lucide-react";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";

const SECTIONS: NavSection[] = [
  {
    title: "Ensino",
    items: [
      {
        label: "Painel",
        href: "/instrutor",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Novo curso",
        href: "/instrutor/curso/novo",
        icon: Plus,
      },
    ],
  },
];

interface InstrutorShellProps {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
}

export default function InstrutorShell({
  user,
  children,
}: InstrutorShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={pathname}
      appName="Plataforma — Instrutor"
      logo={
        <BookOpen
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-cyan)" }}
          aria-hidden="true"
        />
      }
      sidebarDark
      headerActions={
        <NotificationBellContainer
          currentAppId="plataforma"
          centerHref="/instrutor/notificacoes"
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
