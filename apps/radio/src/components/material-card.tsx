"use client";

import { Download, FileText, Lock } from "lucide-react";
import { Button } from "@hebron/ui";
import type { ExclusiveMaterial } from "@hebron/types/radio";

export interface MaterialCardProps {
  material: ExclusiveMaterial;
  termAccepted: boolean;
  onDownload?: (material: ExclusiveMaterial) => void;
  onRequestTermAcceptance?: () => void;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export function MaterialCard({
  material,
  termAccepted,
  onDownload,
  onRequestTermAcceptance,
  className,
}: MaterialCardProps) {
  const locked = material.requiresTerm && !termAccepted;

  return (
    <article
      className={cn(
        "flex items-center gap-4 rounded-(--radius-md) border border-(--border)",
        "bg-(--surface) p-4",
        className,
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius) bg-(--surface-alt)">
        <FileText className="h-5 w-5 text-(--fg-muted)" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-(--font-weight-semibold) text-(--fg)">
          {material.title}
        </p>
        {material.description && (
          <p className="mt-0.5 truncate text-xs text-(--fg-muted)">
            {material.description}
          </p>
        )}
        {material.requiresTerm && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-(--fg-muted)">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Requer aceite do termo de uso
          </p>
        )}
      </div>

      {locked ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRequestTermAcceptance}
          leftIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
        >
          Aceitar termo
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onDownload?.(material)}
          leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
        >
          Baixar
        </Button>
      )}
    </article>
  );
}
