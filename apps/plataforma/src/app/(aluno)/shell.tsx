"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  type NavSection,
} from "@hebron/ui";
import { LayoutGrid, Route, Award } from "lucide-react";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";

const SECTIONS: NavSection[] = [
  {
    title: "Aprender",
    items: [
      {
        label: "Catálogo",
        href: "/",
        icon: LayoutGrid,
        exact: true,
      },
      {
        label: "Minha jornada",
        href: "/jornada",
        icon: Route,
      },
      {
        label: "Certificados",
        href: "/certificados",
        icon: Award,
      },
    ],
  },
];

interface AlunoShellProps {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
}

export default function AlunoShell({ user, children }: AlunoShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/meus-dados"
      onLogout={() => void logoutAction()}
      currentPath={pathname}
      appName="Plataforma"
      logo={<ModuleLogo module="plataforma" />}
      LinkComponent={Link}
      headerActions={
        <NotificationBellContainer
          currentAppId="plataforma"
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
