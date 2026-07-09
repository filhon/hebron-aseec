import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BrandMarkProps extends React.HTMLAttributes<HTMLDivElement> {
  showName?: boolean;
  compact?: boolean;
  /** Diâmetro do símbolo em pixels. */
  size?: number;
  /** Usa cores invertidas (--fg-invert) para uso sobre superfícies de marca/escuras. */
  inverted?: boolean;
}

export function BrandMark({
  showName = true,
  compact = false,
  size = 32,
  inverted = false,
  className,
  ...props
}: BrandMarkProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={showName ? undefined : "Hebron ASEEC"}
      {...props}
    >
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className="relative block shrink-0 rounded-full bg-(--brand)"
      >
        <span className="absolute left-[12.5%] top-[12.5%] h-[43.75%] w-[43.75%] rounded-full bg-(--accent)" />
        <span className="absolute bottom-[18.75%] left-[31.25%] h-[25%] w-[25%] rounded-full bg-(--hb-green)" />
        <span className="absolute right-[18.75%] top-[37.5%] h-[31.25%] w-[31.25%] rounded-full bg-(--hb-cyan)" />
      </span>

      {showName && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              "block truncate font-(--font-display) text-(--text-base)",
              inverted ? "text-(--fg-invert)" : "text-(--fg)",
            )}
          >
            Hebron ASEEC
          </span>
          {!compact && (
            <span
              className={cn(
                "mt-0.5 block truncate text-(--text-xs) font-(--font-weight-medium)",
                inverted ? "text-(--fg-invert-muted)" : "text-(--fg-muted)",
              )}
            >
              Administração
            </span>
          )}
        </span>
      )}
    </div>
  );
}
