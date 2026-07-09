import type { CSSProperties } from "react";
import { Handshake, MapPin } from "lucide-react";
import { EmptyState, PageHeader } from "@hebron/ui";
import type { MeetingDecisionStatus } from "@hebron/types/intranet";
import {
  mockCalendarEvents,
  mockMeetingDecisions,
} from "../../../lib/mock-data";

const STATUS_LABEL: Record<MeetingDecisionStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_STYLE: Record<MeetingDecisionStatus, CSSProperties> = {
  pendente: {
    background: "var(--hb-orange-muted)",
    color: "var(--hb-orange-deep)",
  },
  em_andamento: {
    background: "color-mix(in srgb, var(--hb-cyan) 16%, transparent)",
    color: "var(--hb-cyan-deep)",
  },
  concluida: {
    background: "color-mix(in srgb, var(--hb-green) 16%, transparent)",
    color: "var(--hb-green-deep)",
  },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function ReunioesPage() {
  const meetings = mockCalendarEvents
    .filter((event) => event.type === "reuniao")
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return (
    <div className="hb-page">
      <PageHeader
        title="Reuniões"
        description="Atas e decisões da diretoria e do conselho."
      />

      {meetings.length === 0 ? (
        <EmptyState icon={Handshake} title="Nenhuma reunião registrada" />
      ) : (
        <div className="hb-meeting-list">
          {meetings.map((meeting) => {
            const decisions = mockMeetingDecisions.filter(
              (d) => d.meetingSessionId === meeting.meetingSessionId,
            );
            const day = meeting.startAt.getDate().toString().padStart(2, "0");
            const month = formatDate(meeting.startAt).split(" ")[1] ?? "";

            return (
              <div
                key={meeting.id}
                className="hb-card hb-card-padded"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div style={{ display: "flex", gap: 18 }}>
                  <div className="hb-meeting-date-block" style={{ width: 64 }}>
                    <div className="day">{day}</div>
                    <div className="month">{month}</div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4>{meeting.title}</h4>
                    {meeting.description && (
                      <p className="hb-meeting-sub">{meeting.description}</p>
                    )}
                    <div className="hb-meeting-meta-row">
                      <span>Presidida por {meeting.createdByName}</span>
                      {meeting.location && (
                        <span>
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {meeting.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {decisions.length > 0 && (
                  <div style={{ paddingLeft: 82 }}>
                    <p className="hb-section-label">Decisões</p>
                    <ul
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {decisions.map((decision) => (
                        <li
                          key={decision.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            fontSize: 13.5,
                          }}
                        >
                          <span
                            className="hb-badge"
                            style={{
                              ...STATUS_STYLE[decision.status],
                              flexShrink: 0,
                            }}
                          >
                            {STATUS_LABEL[decision.status]}
                          </span>
                          <span className="text-(--fg)">
                            {decision.description}
                            <span className="text-(--text-xs)">
                              {" "}
                              — {decision.responsibleName}
                              {decision.dueDate &&
                                ` · até ${formatDate(decision.dueDate)}`}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
