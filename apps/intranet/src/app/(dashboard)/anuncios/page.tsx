"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { PageHeader, EmptyState } from "@hebron/ui";
import type { AnnouncementPriority } from "@hebron/types/intranet";
import { mockAnnouncements } from "../../../lib/mock-data";
import { AnnouncementCard } from "../../../components/announcement-card";

type PriorityFilter = AnnouncementPriority | "all";

const FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "urgente", label: "Urgente" },
  { value: "importante", label: "Importante" },
  { value: "normal", label: "Aviso" },
];

export default function AnunciosPage() {
  const [priority, setPriority] = useState<PriorityFilter>("all");

  const announcements = [...mockAnnouncements]
    .sort((a, b) => {
      const aTime = a.publishedAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.publishedAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
    })
    .filter((a) => priority === "all" || a.priority === priority);

  return (
    <div className="hb-page">
      <PageHeader
        title="Anúncios"
        description="Comunicados da diretoria e das equipes para toda a Hebron Aseec."
      />

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

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum anúncio nessa categoria"
          description="Tente outro filtro de prioridade."
        />
      ) : (
        <div className="hb-grid hb-grid-2">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
            />
          ))}
        </div>
      )}
    </div>
  );
}
