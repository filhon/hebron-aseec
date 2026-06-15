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
}: EmptyStateProps) {
  const displayQuote = quote ?? DEFAULT_QUOTE;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[--surface-alt]">
        <Icon className="h-8 w-8 text-[--fg-muted]" aria-hidden="true" />
      </div>

      <div className="max-w-sm space-y-2">
        <h3 className="text-[--text-lg] font-[--font-weight-semibold]">
          {title}
        </h3>
        {description && <p className="text-[--text-sm]">{description}</p>}
      </div>

      {action && <div>{action}</div>}

      {!hideQuote && (
        <blockquote className="max-w-xs border-l-2 border-[--border] pl-4 text-left">
          <p className="italic text-[--fg-muted]">"{displayQuote.text}"</p>
          <cite className="mt-1 block font-[--font-weight-medium] text-[--fg-muted] not-italic">
            — {displayQuote.reference}
          </cite>
        </blockquote>
      )}
    </div>
  );
}
