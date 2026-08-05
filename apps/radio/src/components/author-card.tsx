import Link from "next/link";
import { ChevronRight, User } from "lucide-react";
import type { Author, Series } from "@hebron/types/radio";

export interface AuthorCardProps {
  author: Author;
  series: Series[];
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export function AuthorCard({ author, series, className }: AuthorCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-(--radius-md) border border-(--border)",
        "bg-(--surface) p-5",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--brand-muted)">
          {author.photoUrl ? (
            <img
              src={author.photoUrl}
              alt={author.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-(--brand)" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-(family-name:--font-display) text-lg text-(--fg)">
            {author.name}
          </h3>
          {author.bio && (
            <p className="mt-0.5 line-clamp-2 text-sm text-(--fg-muted)">
              {author.bio}
            </p>
          )}
        </div>
      </div>

      {series.length > 0 && (
        <ul className="flex flex-col divide-y divide-(--divider) border-t border-(--divider) pt-2">
          {series.map((item) => (
            <li key={item.id}>
              <Link
                href={`/series/${item.id}`}
                className={cn(
                  "flex items-center justify-between gap-2 py-2 text-sm",
                  "text-(--fg) transition-colors duration-(--transition-fast)",
                  "hover:text-(--brand)",
                )}
              >
                <span className="truncate">{item.name}</span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-(--fg-subtle)"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
