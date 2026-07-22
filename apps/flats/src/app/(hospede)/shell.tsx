"use client";

import { usePathname } from "next/navigation";
import { AppShell, type NavSection } from "@hebron/ui";
import { Home, CalendarPlus, History, BedDouble } from "lucide-react";
import { logoutAction } from "../../actions/auth";

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
      logo={
        <BedDouble
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--hb-cyan)" }}
        />
      }
      sidebarDark
    >
      {children}
    </AppShell>
  );
}
