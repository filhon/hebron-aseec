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
}

export function ErrorState({
  title = "Algo deu errado",
  description,
  error,
  action,
  className,
}: ErrorStateProps) {
  const errorMessage = typeof error === "string" ? error : error?.message;
  const displayDescription = description ?? errorMessage;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-destructive-muted]">
        <AlertTriangle
          className="h-7 w-7 text-[--color-destructive]"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-sm space-y-1">
        <h3 className="text-[--text-base] font-[--font-weight-semibold]">
          {title}
        </h3>
        {displayDescription && (
          <p className="text-[--text-sm]">{displayDescription}</p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
