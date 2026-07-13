"use client";

import { usePathname, useRouter } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import { BookOpen, LayoutDashboard, Plus } from "lucide-react";

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

const MOCK_USER = {
  name: "Pr. Elias Cavalcanti",
  email: "elias.cavalcanti@hebronaseec.com.br",
};

export default function InstrutorLayout({
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
      appName="Plataforma — Instrutor"
      logo={
        <BookOpen
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-cyan)" }}
          aria-hidden="true"
        />
      }
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
