import * as React from "react";
import { Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconSizes = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

export function LoadingState({
  message = "Carregando...",
  size = "md",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={message ? undefined : "Carregando"}
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
    >
      <Loader2
        className={cn(
          iconSizes[size],
          "animate-spin text-(--brand) motion-reduce:animate-none",
        )}
        aria-hidden="true"
      />
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
