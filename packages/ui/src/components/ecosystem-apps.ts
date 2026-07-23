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

/**
 * Resolve o destino de clique de uma notificação a partir do seu `payload`.
 *
 * Contrato do payload (P-0.6b): `module` é o id canônico do app de origem
 * (mesmo id de `ECOSYSTEM_APPS`) e `href` é relativo a esse módulo. Mesmo
 * módulo do app atual (ou payload antigo sem `module`) → devolve o `href`
 * relativo como está, já que o app atual sabe rotear localmente. Módulo
 * diferente → prefixa a URL canônica do módulo de origem (única fonte:
 * `ECOSYSTEM_APPS`), formando uma URL absoluta cross-app.
 */
export function resolveNotificationHref(
  payload: Record<string, unknown> | null | undefined,
  currentAppId: string,
): string {
  const moduleId =
    typeof payload?.["module"] === "string"
      ? (payload["module"] as string)
      : undefined;
  const relativeHref =
    typeof payload?.["href"] === "string" ? (payload["href"] as string) : "/";

  if (!moduleId || moduleId === currentAppId) return relativeHref;

  const originApp = ECOSYSTEM_APPS.find((app) => app.id === moduleId);
  if (!originApp) return relativeHref;

  return `${originApp.href}${relativeHref}`;
}
