import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BrandMarkProps extends React.HTMLAttributes<HTMLDivElement> {
  showName?: boolean;
  compact?: boolean;
}

export function BrandMark({
  showName = true,
  compact = false,
  className,
  ...props
}: BrandMarkProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Hebron ASEEC"
      {...props}
    >
      <span
        aria-hidden="true"
        className="relative block h-8 w-8 shrink-0 rounded-full bg-(--brand)"
      >
        <span className="absolute left-1 top-1 h-3.5 w-3.5 rounded-full bg-(--accent)" />
        <span className="absolute bottom-1.5 left-2.5 h-2 w-2 rounded-full bg-(--hb-green)" />
        <span className="absolute right-1.5 top-3 h-2.5 w-2.5 rounded-full bg-(--hb-cyan)" />
      </span>

      {showName && (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-(--font-display) text-(--text-base)">
            Hebron ASEEC
          </span>
          {!compact && (
            <span className="mt-0.5 block truncate text-[10px] font-(--font-weight-medium) text-(--fg-muted)">
              Administração
            </span>
          )}
        </span>
      )}
    </div>
  );
}
