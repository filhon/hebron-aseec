import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HebronSymbol, type BrandTone } from "./hebron-brand";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BrandMarkProps extends React.HTMLAttributes<HTMLDivElement> {
  showName?: boolean;
  compact?: boolean;
  /** Altura do símbolo em pixels. */
  size?: number;
  /** Usa cores invertidas (--fg-invert) para uso sobre superfícies de marca/escuras. */
  inverted?: boolean;
  /** Linha de apoio sob o nome. Só aparece quando `compact` é falso. */
  tagline?: string;
}

/**
 * Assinatura institucional da Hebron Aseec: símbolo oficial + nome.
 *
 * Para o logotipo completo com a assinatura desenhada, use `HebronLockup`.
 * Para identidade de módulo, use `ModuleLogo`.
 */
export function BrandMark({
  showName = true,
  compact = false,
  size = 32,
  inverted = false,
  tagline,
  className,
  ...props
}: BrandMarkProps) {
  const tone: BrandTone = inverted ? "light" : "color";

  return (
    <div
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={showName ? undefined : "Hebron Aseec"}
      {...props}
    >
      <HebronSymbol size={size} tone={tone} />

      {showName && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              "block truncate font-(--font-display) text-base",
              inverted ? "text-(--fg-invert)" : "text-(--fg)",
            )}
          >
            Hebron Aseec
          </span>
          {!compact && tagline && (
            <span
              className={cn(
                "mt-0.5 block truncate text-xs font-(--font-weight-medium)",
                inverted ? "text-(--fg-invert-muted)" : "text-(--fg-muted)",
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
