import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-2 pb-6", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Localização atual">
          <ol className="flex flex-wrap items-center gap-1.5 text-(--fg-muted)">
            {breadcrumb.map((item, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={item.label}>
                  {i > 0 && (
                    <li aria-hidden="true" className="select-none">
                      /
                    </li>
                  )}
                  <li>
                    {item.href ? (
                      <a
                        href={item.href}
                        className={cn(
                          "transition-colors duration-(--transition-fast) hover:text-(--fg)",
                          isLast && "font-(--font-weight-medium) text-(--fg)",
                        )}
                        aria-current={isLast ? "page" : undefined}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span
                        className={
                          isLast
                            ? "font-(--font-weight-medium) text-(--fg)"
                            : ""
                        }
                        aria-current={isLast ? "page" : undefined}
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="font-(family-name:--font-editorial) text-2xl font-bold leading-(--leading-tight)">
            {title}
          </h1>
          {description && <p className="text-sm">{description}</p>}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
