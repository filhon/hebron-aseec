import {
  DollarSign,
  FolderOpen,
  BookOpen,
  Radio,
  Folder,
  CheckCircle,
  Settings,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface AppLauncherApp {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const APPS: AppLauncherApp[] = [
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
    icon: FolderOpen,
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
    icon: DollarSign,
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
    icon: Building2,
  },
  {
    id: "tarefas",
    label: "Tarefas",
    href: "https://tarefas.hebronaseec.com.br",
    icon: CheckCircle,
  },
];

export interface AppLauncherProps {
  title?: string;
}

export function AppLauncher({ title = "Outros módulos" }: AppLauncherProps) {
  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <h3>{title}</h3>
      </div>
      <div className="hb-card-body">
        <div className="grid grid-cols-2 gap-(--sp-3) sm:grid-cols-4">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <a
                key={app.id}
                href={app.href}
                className="flex flex-col items-center gap-2 rounded-(--radius) p-3 text-center transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-sm"
                  style={{
                    background: "var(--brand-muted)",
                    color: "var(--brand)",
                  }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium">
                  {app.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
