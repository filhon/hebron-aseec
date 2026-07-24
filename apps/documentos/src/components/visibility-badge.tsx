import type { DocumentVisibility } from "@hebron/types/documentos";
import type { LucideIcon } from "lucide-react";
import { Globe, Lock, Users } from "lucide-react";

interface VisibilityConfig {
  label: string;
  dotColor: string;
  badgeClass: string;
  Icon: LucideIcon;
}

export const VISIBILITY: Record<DocumentVisibility, VisibilityConfig> = {
  public: {
    label: "Público",
    dotColor: "var(--hb-green)",
    badgeClass: "bg-(--hb-green-muted) text-(--hb-green-fg)",
    Icon: Globe,
  },
  internal: {
    label: "Interno",
    dotColor: "var(--hb-cyan)",
    badgeClass: "bg-(--hb-cyan-muted) text-(--hb-cyan-fg)",
    Icon: Users,
  },
  restricted: {
    label: "Restrito",
    dotColor: "var(--hb-red)",
    badgeClass: "bg-(--color-destructive-muted) text-(--hb-red)",
    Icon: Lock,
  },
};

export interface VisibilityBadgeProps {
  visibility: DocumentVisibility;
  size?: "sm" | "md";
  withIcon?: boolean;
  className?: string;
}

export function VisibilityBadge({
  visibility,
  size = "sm",
  withIcon = true,
  className = "",
}: VisibilityBadgeProps) {
  const vis = VISIBILITY[visibility];
  const VisIcon = vis.Icon;

  return (
    <span
      className={`hb-badge ${size === "md" ? "text-[12.5px] px-3 py-1" : ""} ${vis.badgeClass} ${className}`}
    >
      <span
        className="hb-badge-dot"
        style={{ backgroundColor: vis.dotColor }}
      />
      {withIcon && (
        <VisIcon size={size === "md" ? 12 : 11} aria-hidden="true" />
      )}
      {vis.label}
    </span>
  );
}
