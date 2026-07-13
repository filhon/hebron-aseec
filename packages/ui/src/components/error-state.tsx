import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  action?: React.ReactNode;
  className?: string;
  /** Nível do heading do título, para manter a hierarquia da página. @default "h3" */
  titleAs?: "h2" | "h3" | "h4";
}

const GENERIC_ERROR_DESCRIPTION =
  "Tente novamente ou entre em contato com o suporte se o problema persistir.";

export function ErrorState({
  title = "Algo deu errado",
  description,
  error,
  action,
  className,
  titleAs: Title = "h3",
}: ErrorStateProps) {
  // Error.message costuma conter texto técnico interno (stack, erro de banco etc.) —
  // só é exibido diretamente quando `error` é uma string escrita deliberadamente.
  const errorMessage = typeof error === "string" ? error : undefined;
  const displayDescription =
    description ??
    errorMessage ??
    (error ? GENERIC_ERROR_DESCRIPTION : undefined);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-destructive-muted)">
        <AlertTriangle
          className="h-7 w-7 text-(--color-destructive)"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-sm space-y-1">
        <Title className="font-(--font-display) text-base font-(--font-weight-semibold)">
          {title}
        </Title>
        {displayDescription && (
          <p className="text-sm">{displayDescription}</p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
