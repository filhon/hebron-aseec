"use client";

import { BedDouble, Home, Users } from "lucide-react";
import type { Unit } from "@hebron/types/flats";

export interface UnitCardProps {
  unit: Unit;
  onSelect?: (unit: Unit) => void;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const VISIBLE_AMENITIES = 4;

export function UnitCard({ unit, onSelect, className }: UnitCardProps) {
  const [cover] = unit.photos;
  const extraPhotos = unit.photos.length - 1;
  const visibleAmenities = unit.amenities.slice(0, VISIBLE_AMENITIES);
  const extraAmenities = unit.amenities.length - visibleAmenities.length;

  const content = (
    <>
      <div className="relative h-40 w-full overflow-hidden rounded-t-(--radius) bg-(--surface-alt)">
        {cover ? (
          <img
            src={cover}
            alt={unit.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-8 w-8 text-(--fg-subtle)" aria-hidden="true" />
          </div>
        )}

        {extraPhotos > 0 && (
          <span className="absolute bottom-2 right-2 rounded-(--radius-pill) bg-(--overlay) px-2 py-0.5 text-xs font-semibold text-(--fg-invert)">
            +{extraPhotos} foto{extraPhotos !== 1 ? "s" : ""}
          </span>
        )}

        <span
          className={cn(
            "absolute left-2 top-2 rounded-(--radius-pill) px-2.5 py-0.5 text-xs font-semibold",
            unit.isActive
              ? "bg-(--hb-green-muted) text-(--hb-green-deep)"
              : "bg-(--surface-alt) text-(--fg-muted)",
          )}
        >
          {unit.isActive ? "Disponível" : "Indisponível"}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3
            className="text-base font-semibold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {unit.name}
          </h3>
          {unit.description && (
            <p className="mt-1 line-clamp-2 text-sm text-(--fg-muted)">
              {unit.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-(--fg-muted)">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden="true" />
            Até {unit.capacity} pessoas
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4" aria-hidden="true" />
            {unit.bedrooms} quartos{unit.hasSuite ? " (1 suíte)" : ""}
          </span>
        </div>

        {unit.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleAmenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-(--radius-pill) border border-(--border) px-2.5 py-0.5 text-xs text-(--fg-muted)"
              >
                {amenity}
              </span>
            ))}
            {extraAmenities > 0 && (
              <span className="rounded-(--radius-pill) border border-(--border) px-2.5 py-0.5 text-xs text-(--fg-muted)">
                +{extraAmenities}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(unit)}
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface) text-left",
          "transition-shadow duration-(--transition-fast) hover:shadow-(--shadow-md)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:ring-offset-2",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface)",
        className,
      )}
    >
      {content}
    </div>
  );
}
