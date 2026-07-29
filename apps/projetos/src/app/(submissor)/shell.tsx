"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  ModuleLogo,
  NotificationBellContainer,
  type NavSection,
} from "@hebron/ui";
import { LayoutDashboard, FolderPlus, Building2, FileText } from "lucide-react";
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
        label: "Meus Projetos",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
      { label: "Novo Projeto", href: "/novo", icon: FolderPlus },
      { label: "Relatórios", href: "/relatorios", icon: FileText },
      { label: "Minha Instituição", href: "/instituicao", icon: Building2 },
    ],
  },
];

type Props = {
  user: { fullName: string | null; email: string | null };
  children: React.ReactNode;
};

export default function SubmissorShell({ user, children }: Props) {
  const path = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/instituicao"
      onLogout={() => void logoutAction()}
      currentPath={path}
      appName="Projetos"
      logo={<ModuleLogo module="projetos" />}
      sidebarDark
      LinkComponent={Link}
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
