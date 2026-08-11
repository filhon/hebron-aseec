import { getAppShortcuts } from "@hebron/ui";

export interface AppLauncherProps {
  title?: string;
}

export function AppLauncher({ title = "Outros módulos" }: AppLauncherProps) {
  const apps = getAppShortcuts("intranet");

  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <h3>{title}</h3>
      </div>
      <div className="hb-card-body">
        <div className="grid grid-cols-2 gap-(--sp-3) sm:grid-cols-4">
          {apps.map((app) => {
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
                <span className="text-xs font-medium">{app.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
