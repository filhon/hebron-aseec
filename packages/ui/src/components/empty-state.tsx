import * as React from "react";
import { Inbox } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LucideIcon } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BibleQuote {
  text: string;
  reference: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  quote?: BibleQuote;
  hideQuote?: boolean;
  className?: string;
  /** Nível do heading do título, para manter a hierarquia da página. @default "h3" */
  titleAs?: "h2" | "h3" | "h4";
}

const DEFAULT_QUOTE: BibleQuote = {
  text: "O Senhor é bom para os que esperam por ele, para a alma que o busca.",
  reference: "Lamentações 3:25",
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  quote,
  hideQuote = false,
  className,
  titleAs: Title = "h3",
}: EmptyStateProps) {
  const displayQuote = quote ?? DEFAULT_QUOTE;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-(--border) bg-(--surface-alt)">
        <Icon className="h-6 w-6 text-(--brand)" aria-hidden="true" />
      </div>

      <div className="max-w-sm space-y-1.5">
        <Title className="font-(--font-display) text-lg font-(--font-weight-semibold)">
          {title}
        </Title>
        {description && <p className="text-sm">{description}</p>}
      </div>

      {action && <div>{action}</div>}

      {!hideQuote && (
        <blockquote className="mt-1 max-w-xs">
          <p className="text-xs italic leading-relaxed text-(--fg-muted)">
            “{displayQuote.text}”
          </p>
          <cite className="mt-1.5 block text-xs font-(--font-weight-semibold) not-italic text-(--brand)">
            — {displayQuote.reference}
          </cite>
        </blockquote>
      )}
    </div>
  );
}
