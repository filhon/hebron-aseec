import type { CSSProperties } from "react";
import { Handshake } from "lucide-react";
import { EmptyState, ErrorState, PageHeader } from "@hebron/ui";
import type { MeetingDecisionStatus } from "@hebron/types/intranet";
import {
  getAuthUser,
  getMeetingSessionOptions,
  getMeetingSessionsWithDecisions,
  getStaffOptions,
} from "../../../lib/queries";
import { MeetingDecisionDialog } from "../../../components/meeting-decision-dialog";

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

async function loadReunioesData() {
  const [sessions, user, meetingOptions, staffOptions] = await Promise.all([
    getMeetingSessionsWithDecisions(),
    getAuthUser(),
    getMeetingSessionOptions(),
    getStaffOptions(),
  ]);
  return {
    sessions,
    canRegisterDecision: user?.roles.includes("super_admin") ?? false,
    meetingOptions,
    staffOptions,
  };
}

export default async function ReunioesPage() {
  let data: Awaited<ReturnType<typeof loadReunioesData>>;

  try {
    data = await loadReunioesData();
  } catch {
    return (
      <div className="hb-page">
        <ErrorState
          title="Não foi possível carregar as reuniões"
          description="Verifique sua conexão e tente novamente."
        />
      </div>
    );
  }

  const { sessions, canRegisterDecision, meetingOptions, staffOptions } = data;

  return (
    <div className="hb-page">
      <PageHeader
        title="Reuniões"
        description="Atas e decisões da diretoria e do conselho."
        actions={
          canRegisterDecision ? (
            <MeetingDecisionDialog
              meetings={meetingOptions}
              responsibles={staffOptions}
            />
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState icon={Handshake} title="Nenhuma reunião registrada" />
      ) : (
        <div className="hb-meeting-list">
          {sessions.map((session) => {
            const day = session.date.getDate().toString().padStart(2, "0");
            const month = formatDate(session.date).split(" ")[1] ?? "";

            return (
              <div
                key={session.id}
                className="hb-card hb-card-padded"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div style={{ display: "flex", gap: 18 }}>
                  <div className="hb-meeting-date-block" style={{ width: 64 }}>
                    <div className="day">{day}</div>
                    <div className="month">{month}</div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4>Reunião {session.typeLabel}</h4>
                    {session.notes && (
                      <p className="hb-meeting-sub">{session.notes}</p>
                    )}
                    {session.chairName && (
                      <div className="hb-meeting-meta-row">
                        <span>Presidida por {session.chairName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {session.decisions.length > 0 && (
                  <div style={{ paddingLeft: 82 }}>
                    <p className="hb-section-label">Decisões</p>
                    <ul
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {session.decisions.map((decision) => (
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
