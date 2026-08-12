import { Suspense, type CSSProperties } from "react";
import { ArrowUpRight, Handshake } from "lucide-react";
import { ECOSYSTEM_APPS, EmptyState, ErrorState, PageHeader } from "@hebron/ui";
import type { MeetingDecisionStatus } from "@hebron/types/intranet";
import {
  getAuthUser,
  getMeetingSessionOptions,
  getMeetingSessionsWithDecisions,
  getStaffOptions,
} from "../../../lib/queries";
import { MeetingDecisionDialog } from "../../../components/meeting-decision-dialog";
import { MeetingDecisionStatusSelect } from "../../../components/meeting-decision-status-select";

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

// Base do app Tarefas vem do catálogo único (ECOSYSTEM_APPS, packages/ui) —
// mesma fonte do trocador de apps e do lançador (P-5.3c), nunca uma
// constante nova. Resolve NEXT_PUBLIC_TAREFAS_URL quando definida.
function taskHref(taskId: string): string {
  const base = ECOSYSTEM_APPS.find((app) => app.id === "tarefas")?.href;
  return base ? `${base}/tarefa/${taskId}` : "#";
}

function Bone({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xs ${className}`}
      style={{ background: "var(--surface-alt)" }}
    />
  );
}

function ReunioesSkeleton() {
  return (
    <div className="hb-meeting-list" aria-label="Carregando reuniões">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="hb-card hb-card-padded"
          style={{ display: "flex", gap: 18 }}
          aria-hidden="true"
        >
          <Bone className="h-16 w-16 shrink-0 rounded-sm" />
          <div
            style={{
              minWidth: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Bone className="h-3.5 w-40" />
            <Bone className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ReunioesContent({
  isSuperAdmin,
  isBoard,
  userId,
}: {
  isSuperAdmin: boolean;
  isBoard: boolean;
  userId: string | null;
}) {
  let sessions: Awaited<ReturnType<typeof getMeetingSessionsWithDecisions>>;

  try {
    sessions = await getMeetingSessionsWithDecisions();
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar as reuniões"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="Nenhuma reunião registrada"
        description="As atas das reuniões aparecem aqui depois de registradas."
        quote={{
          text: "Onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles.",
          reference: "Mateus 18:20",
        }}
      />
    );
  }

  return (
    <div className="hb-meeting-list">
      {sessions.map((session) => {
        const day = session.date.getDate().toString().padStart(2, "0");
        const month = formatDate(session.date).split(" ")[1] ?? "";
        // Presidente da sessão ou super_admin altera o status das decisões
        // desta sessão (0040_intranet_meeting_decisions_chair_rls.sql).
        const canEditStatus =
          isSuperAdmin ||
          (isBoard && !!userId && session.chairUserId === userId);

        return (
          <div
            key={session.id}
            id={`reuniao-${session.id}`}
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
              <div style={{ paddingLeft: "var(--sp-4)" }}>
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
                      {canEditStatus ? (
                        <MeetingDecisionStatusSelect
                          meetingDecisionId={decision.id}
                          status={decision.status}
                        />
                      ) : (
                        <span
                          className="hb-badge"
                          style={{
                            ...STATUS_STYLE[decision.status],
                            flexShrink: 0,
                          }}
                        >
                          {STATUS_LABEL[decision.status]}
                        </span>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span className="text-(--fg)">
                          {decision.description}
                          <span className="text-xs">
                            {" "}
                            — {decision.responsibleName}
                            {decision.dueDate &&
                              ` · até ${formatDate(decision.dueDate)}`}
                          </span>
                        </span>
                        {decision.taskId && (
                          <a
                            href={taskHref(decision.taskId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center gap-1.5 text-xs font-medium text-(--brand) transition-colors duration-(--transition-fast) hover:text-(--hb-blue-deep)"
                          >
                            <ArrowUpRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Ver tarefa
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function ReunioesPage() {
  const user = await getAuthUser();
  const isSuperAdmin = user?.roles.includes("super_admin") ?? false;
  const isBoard =
    user?.roles.some((r) => r === "diretor" || r === "conselheiro") ?? false;

  // Só busca opções de reunião/responsáveis (para o formulário de decisão) se
  // o papel puder registrar alguma — evita duas leituras a mais para quem
  // (colaborador) nunca veria o botão de qualquer forma.
  let meetingOptions: Awaited<ReturnType<typeof getMeetingSessionOptions>> = [];
  let staffOptions: Awaited<ReturnType<typeof getStaffOptions>> = [];
  let canRegisterDecision = false;

  if (isSuperAdmin || isBoard) {
    // Presidente de sessão (diretor/conselheiro) só registra decisão nas
    // reuniões que preside (PATCH-017); super_admin vê/registra em todas.
    [meetingOptions, staffOptions] = await Promise.all([
      getMeetingSessionOptions(isSuperAdmin || !user ? undefined : user.id),
      getStaffOptions(),
    ]);
    canRegisterDecision = isSuperAdmin || meetingOptions.length > 0;
  }

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

      <Suspense fallback={<ReunioesSkeleton />}>
        <ReunioesContent
          isSuperAdmin={isSuperAdmin}
          isBoard={isBoard}
          userId={user?.id ?? null}
        />
      </Suspense>
    </div>
  );
}
