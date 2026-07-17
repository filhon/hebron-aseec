import { Disc3 } from "lucide-react";

export interface TrackInfoProps {
  title: string;
  authorName: string;
  seriesName?: string | null;
  durationSeconds: number;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackInfo({
  title,
  authorName,
  seriesName,
  durationSeconds,
  className,
}: TrackInfoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius) bg-(--brand-muted)">
        <Disc3 className="h-5 w-5 text-(--brand)" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-(--font-weight-semibold) text-(--fg)">
          {title}
        </p>
        <p className="truncate text-xs text-(--fg-muted)">
          {authorName}
          {seriesName ? ` · ${seriesName}` : ""}
          {" · "}
          {formatDuration(durationSeconds)}
        </p>
      </div>
    </div>
  );
}
