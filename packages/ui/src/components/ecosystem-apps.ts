import {
  Settings,
  Briefcase,
  BookOpen,
  Radio,
  BadgeDollarSign,
  Home,
  Folder,
  BedDouble,
  CheckCircle,
} from "lucide-react";
import type { AppShortcut } from "./navigation-sidebar";

/**
 * Catálogo canônico dos 9 apps do ecossistema Hebron Aseec, em ordem fixa.
 * Única fonte de ícone/label/URL de atalho — não duplicar em shells de app.
 */
export const ECOSYSTEM_APPS: AppShortcut[] = [
  {
    id: "admin",
    label: "Admin",
    href: "https://admin.hebronaseec.com.br",
    icon: Settings,
  },
  {
    id: "projetos",
    label: "Projetos",
    href: "https://projetos.hebronaseec.com.br",
    icon: Briefcase,
  },
  {
    id: "plataforma",
    label: "Plataforma",
    href: "https://plataforma.hebronaseec.com.br",
    icon: BookOpen,
  },
  {
    id: "radio",
    label: "Rádio",
    href: "https://radio.hebronaseec.com.br",
    icon: Radio,
  },
  {
    id: "financeiro",
    label: "Financeiro",
    href: "https://financeiro.hebronaseec.com.br",
    icon: BadgeDollarSign,
  },
  {
    id: "intranet",
    label: "Intranet",
    href: "https://app.hebronaseec.com.br",
    icon: Home,
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "https://docs.hebronaseec.com.br",
    icon: Folder,
  },
  {
    id: "flats",
    label: "Flats",
    href: "https://flats.hebronaseec.com.br",
    icon: BedDouble,
  },
  {
    id: "tarefas",
    label: "Tarefas",
    href: "https://tarefas.hebronaseec.com.br",
    icon: CheckCircle,
  },
];

/** Atalhos do ecossistema, excluindo o app atual. */
export function getAppShortcuts(currentAppId: string): AppShortcut[] {
  return ECOSYSTEM_APPS.filter((app) => app.id !== currentAppId);
}
