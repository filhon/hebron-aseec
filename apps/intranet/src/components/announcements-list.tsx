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
  /** super_admin corrige um anúncio já publicado (announcement-card.tsx). */
  canEdit?: boolean;
  /** true quando a leitura bateu no teto de ANNOUNCEMENTS_LIST_LIMIT. */
  capped?: boolean;
}

export function AnnouncementsList({
  announcements,
  canEdit = false,
  capped = false,
}: AnnouncementsListProps) {
  const [priority, setPriority] = useState<PriorityFilter>("all");

  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Nenhum anúncio publicado"
        description="Os comunicados da diretoria e das equipes aparecem aqui."
        quote={{
          text: "Quão formosos são os pés dos que anunciam coisas boas!",
          reference: "Romanos 10:15",
        }}
      />
    );
  }

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
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {capped && (
        <p className="text-xs" style={{ marginTop: 12 }}>
          Mostrando os {announcements.length} anúncios mais recentes.
        </p>
      )}
    </>
  );
}
