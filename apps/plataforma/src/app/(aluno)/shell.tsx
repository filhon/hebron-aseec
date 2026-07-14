"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import { GraduationCap, LayoutGrid, Route, Award } from "lucide-react";
import { logoutAction } from "../../actions/auth";

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

  return (
    <AppShell
      sections={SECTIONS}
      user={{
        name: user.fullName ?? user.email ?? "",
        email: user.email ?? "",
      }}
      profileHref="/perfil"
      onLogout={() => void logoutAction()}
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
