"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@hebron/ui";
import type {
  Announcement,
  AnnouncementPriority,
} from "@hebron/types/intranet";
import { AnnouncementCard } from "./announcement-card";

type PriorityFilter = AnnouncementPriority | "all";

const FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "urgente", label: "Urgente" },
  { value: "importante", label: "Importante" },
  { value: "normal", label: "Aviso" },
];

export interface AnnouncementsListProps {
  announcements: Announcement[];
}

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
  const [priority, setPriority] = useState<PriorityFilter>("all");

  const filtered = announcements.filter(
    (a) => priority === "all" || a.priority === priority,
  );

  return (
    <>
      <div className="hb-chip-row">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`hb-chip${priority === filter.value ? " active" : ""}`}
            onClick={() => setPriority(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum anúncio nessa categoria"
          description="Tente outro filtro de prioridade."
        />
      ) : (
        <div className="hb-grid hb-grid-2">
          {filtered.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
            />
          ))}
        </div>
      )}
    </>
  );
}
