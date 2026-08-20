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
 *
 * URL resolvida de `NEXT_PUBLIC_<MÓDULO>_URL` quando definida (dev local,
 * ver .env.example), com a URL de produção como fallback — mesmo padrão de
 * `apps/intranet/src/actions/search.ts`. Referência literal por módulo
 * (nunca `process.env[chave]`): o Next.js só substitui no bundle do cliente
 * os nomes escritos estaticamente. `admin` e `intranet` não têm variável
 * própria — nenhum `.env` do monorepo a declara hoje — então ficam com a URL
 * de produção fixa.
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
    href:
      process.env.NEXT_PUBLIC_PROJETOS_URL ??
      "https://projetos.hebronaseec.com.br",
    icon: Briefcase,
  },
  {
    id: "plataforma",
    label: "Plataforma",
    href:
      process.env.NEXT_PUBLIC_PLATAFORMA_URL ??
      "https://plataforma.hebronaseec.com.br",
    icon: BookOpen,
  },
  {
    id: "radio",
    label: "Rádio",
    href:
      process.env.NEXT_PUBLIC_RADIO_URL ?? "https://radio.hebronaseec.com.br",
    icon: Radio,
  },
  {
    id: "financeiro",
    label: "Financeiro",
    href:
      process.env.NEXT_PUBLIC_FINANCEIRO_URL ??
      "https://financeiro.hebronaseec.com.br",
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
    href:
      process.env.NEXT_PUBLIC_DOCUMENTOS_URL ??
      "https://docs.hebronaseec.com.br",
    icon: Folder,
  },
  {
    id: "flats",
    label: "Flats",
    href:
      process.env.NEXT_PUBLIC_FLATS_URL ?? "https://flats.hebronaseec.com.br",
    icon: BedDouble,
  },
  {
    id: "tarefas",
    label: "Tarefas",
    href:
      process.env.NEXT_PUBLIC_TAREFAS_URL ??
      "https://tarefas.hebronaseec.com.br",
    icon: CheckCircle,
  },
];

/** Atalhos do ecossistema, excluindo o app atual. */
export function getAppShortcuts(currentAppId: string): AppShortcut[] {
  return ECOSYSTEM_APPS.filter((app) => app.id !== currentAppId);
}

/**
 * URL canônica do Admin — usada pelos outros 8 apps para linkar de volta
 * (ex.: "Encerrar no Admin" no banner de impersonação, PACOTE 6).
 */
export function getAdminUrl(): string {
  const admin = ECOSYSTEM_APPS.find((app) => app.id === "admin");
  if (!admin) throw new Error("ECOSYSTEM_APPS: entrada 'admin' não encontrada");
  return admin.href;
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
