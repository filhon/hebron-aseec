"use client";

import { usePathname, useRouter } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import { GraduationCap, LayoutGrid, Route, Award } from "lucide-react";

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

const MOCK_USER = {
  name: "João Pedro Lima",
  email: "joao.pedro@hebronaseec.com.br",
};

export default function AlunoLayout({
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
      appName="Plataforma"
      logo={
        <GraduationCap
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-teal)" }}
          aria-hidden="true"
        />
      }
    >
      {children}
    </AppShell>
  );
}
