"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  ClipboardList,
  Settings,
  CalendarDays,
} from "lucide-react";
import {
  AppShell,
  BrandMark,
  type NavSection,
  type LinkComponent,
} from "@hebron/ui";

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Usuários",
    items: [
      {
        label: "Lista de usuários",
        href: "/usuarios",
        icon: Users,
      },
      {
        label: "Convites",
        href: "/convites",
        icon: Mail,
        badge: 3,
      },
    ],
  },
  {
    title: "Governança",
    items: [
      {
        label: "Auditoria",
        href: "/auditoria",
        icon: ClipboardList,
      },
      {
        label: "Reuniões",
        href: "/reunioes",
        icon: CalendarDays,
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

const MOCK_USER = {
  name: "Filipe Honório",
  email: "filipe@hebronaseec.com.br",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppShell
      sections={SECTIONS}
      user={MOCK_USER}
      profileHref="/perfil"
      onLogout={() => router.push("/login")}
      currentPath={pathname}
      appName="Hebron ASEEC"
      logo={<BrandMark compact />}
      LinkComponent={Link as LinkComponent}
    >
      {children}
    </AppShell>
  );
}
