"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  type NavSection,
} from "@hebron/ui";
import { LayoutDashboard, Layers, Plus, Users } from "lucide-react";
import { logoutAction } from "../../actions/auth";
import {
  listBellNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../../actions/notifications";

interface InstrutorShellProps {
  user: { fullName: string | null; email: string | null };
  isSuperAdmin: boolean;
  children: React.ReactNode;
}

export default function InstrutorShell({
  user,
  isSuperAdmin,
  children,
}: InstrutorShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // "Equipe" (gestão do cadastro de instrutores) exige super_admin — o gate
  // da própria página (requireSuperAdminSession) rejeitaria um instrutor
  // comum, então o link só aparece para quem a tela de fato aceita (P-6.19,
  // débito de S-118).
  const sections: NavSection[] = [
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
        {
          label: "Séries",
          href: "/instrutor/series",
          icon: Layers,
        },
        ...(isSuperAdmin
          ? [
              {
                label: "Equipe",
                href: "/instrutor/equipe",
                icon: Users,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <AppShell
      sections={sections}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      onLogout={() => void logoutAction()}
      currentPath={pathname}
      appName="Plataforma — Instrutor"
      logo={<ModuleLogo module="plataforma" />}
      sidebarDark
      LinkComponent={Link}
      headerActions={
        <NotificationBellContainer
          currentAppId="plataforma"
          centerHref="/instrutor/notificacoes"
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
