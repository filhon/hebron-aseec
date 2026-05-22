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
          <ol className="flex flex-wrap items-center gap-1.5 text-[--text-sm] text-[--color-muted-foreground]">
            {breadcrumb.map((item, i) => (
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
                      className="transition-colors duration-[--transition-fast] hover:text-[--color-foreground]"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span
                      className={
                        i === breadcrumb.length - 1
                          ? "font-[--font-weight-medium] text-[--color-foreground]"
                          : ""
                      }
                      aria-current={
                        i === breadcrumb.length - 1 ? "page" : undefined
                      }
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              </React.Fragment>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[--text-2xl] font-[--font-weight-bold] leading-[--leading-tight] text-[--color-foreground]">
            {title}
          </h1>
          {description && (
            <p className="text-[--text-sm] text-[--color-muted-foreground]">
              {description}
            </p>
          )}
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
