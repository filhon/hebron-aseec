import Link from "next/link";
import { db } from "@hebron/db/client";
import { eq, asc, desc, or } from "drizzle-orm";
import { users, meetingSessions } from "@hebron/db/schema";
import { Plus, CalendarDays, FileText } from "lucide-react";
import { Button } from "@hebron/ui";

// ─── DB ───────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function getDateParts(date: Date) {
  return {
    day: date.toLocaleDateString("pt-BR", { day: "2-digit" }),
    month: date
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toUpperCase(),
    weekday: DAY_NAMES[date.getDay()] ?? "",
    time: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

// ─── Status config ─────────────────────────────────────────────────────────────

type MeetingStatus = "scheduled" | "in_progress" | "concluded" | "cancelled";

const STATUS_CONFIG: Record<MeetingStatus, { label: string; cls: string }> = {
  scheduled: { label: "Agendada", cls: "hb-status-agendada" },
  in_progress: { label: "Em andamento", cls: "hb-status-pending" },
  concluded: { label: "Realizada", cls: "hb-status-aceito" },
  cancelled: { label: "Cancelada", cls: "hb-status-suspended" },
};

function isMeetingStatus(s: string): s is MeetingStatus {
  return ["scheduled", "in_progress", "concluded", "cancelled"].includes(s);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter === "past" ? "past" : "upcoming";

  const [upcomingRows, pastRows] = await Promise.all([
    db
      .select({
        id: meetingSessions.id,
        date: meetingSessions.date,
        type: meetingSessions.type,
        status: meetingSessions.status,
        notes: meetingSessions.notes,
        chairUserId: meetingSessions.chairUserId,
        chairName: users.fullName,
      })
      .from(meetingSessions)
      .leftJoin(users, eq(meetingSessions.chairUserId, users.id))
      .where(
        or(
          eq(meetingSessions.status, "scheduled"),
          eq(meetingSessions.status, "in_progress"),
        ),
      )
      .orderBy(asc(meetingSessions.date)),

    db
      .select({
        id: meetingSessions.id,
        date: meetingSessions.date,
        type: meetingSessions.type,
        status: meetingSessions.status,
        notes: meetingSessions.notes,
        chairUserId: meetingSessions.chairUserId,
        chairName: users.fullName,
      })
      .from(meetingSessions)
      .leftJoin(users, eq(meetingSessions.chairUserId, users.id))
      .where(
        or(
          eq(meetingSessions.status, "concluded"),
          eq(meetingSessions.status, "cancelled"),
        ),
      )
      .orderBy(desc(meetingSessions.date)),
  ]);

  const list = filter === "upcoming" ? upcomingRows : pastRows;
  const nextMeeting = upcomingRows[0];

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Diretoria · ata e convocação</div>
          <h1 className="hb-page-title">Reuniões</h1>
          <p className="hb-page-subtitle">
            Reuniões mensais são auto-criadas na 1ª quarta-feira do mês, às
            19:30. Extraordinárias são abertas pelo super_admin ou diretor
            gestor.
          </p>
        </div>
        <div className="hb-page-header-actions">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/reunioes/nova">
              <Plus size={14} aria-hidden="true" />
              Nova reunião
            </Link>
          </Button>
        </div>
      </div>

      {/* Next meeting banner */}
      {nextMeeting && (
        <div className="hb-next-meeting-banner">
          <div className="hb-next-meeting-banner-icon">
            <CalendarDays size={22} aria-hidden="true" />
          </div>
          <div className="hb-next-meeting-banner-body">
            <div className="hb-next-meeting-banner-title">
              Próxima reunião{" "}
              {nextMeeting.type === "mensal" ? "mensal" : "extraordinária"}:{" "}
              {getDateParts(nextMeeting.date).weekday.toLowerCase()},{" "}
              {formatLongDate(nextMeeting.date)}
            </div>
            <div className="hb-next-meeting-banner-sub">
              {getDateParts(nextMeeting.date).time} · Presidente da sessão:{" "}
              {nextMeeting.chairName ?? "—"}
            </div>
          </div>
          <div className="hb-next-meeting-banner-actions">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full border-(--brand) text-(--brand)"
            >
              <Link href={`/reunioes/${nextMeeting.id}/editar`}>
                <FileText size={14} aria-hidden="true" />
                Editar pauta
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Tab chips — URL-based */}
      <div className="hb-chip-row">
        <Link
          href="/reunioes"
          className={`hb-chip${filter === "upcoming" ? " active" : ""}`}
        >
          Próximas{" "}
          <span style={{ opacity: 0.6, fontSize: 11 }}>
            · {upcomingRows.length}
          </span>
        </Link>
        <Link
          href="/reunioes?filter=past"
          className={`hb-chip${filter === "past" ? " active" : ""}`}
        >
          Realizadas{" "}
          <span style={{ opacity: 0.6, fontSize: 11 }}>
            · {pastRows.length}
          </span>
        </Link>
      </div>

      {/* Meeting list */}
      {list.length === 0 ? (
        <div className="hb-card">
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <CalendarDays size={22} aria-hidden="true" />
            </div>
            <b>
              {filter === "upcoming"
                ? "Nenhuma reunião agendada."
                : "Nenhuma reunião realizada."}
            </b>
            <div className="hb-empty-quote">
              "Onde dois ou três estiverem reunidos em meu nome, aí estou no
              meio deles."
              <cite className="hb-empty-cite">— Mateus 18:20</cite>
            </div>
          </div>
        </div>
      ) : (
        <div className="hb-meeting-list">
          {list.map((m) => {
            const parts = getDateParts(m.date);
            const statusKey = isMeetingStatus(m.status)
              ? m.status
              : "scheduled";
            const cfg = STATUS_CONFIG[statusKey];
            const isUpcoming =
              m.status === "scheduled" || m.status === "in_progress";
            return (
              <div key={m.id} className="hb-meeting-card">
                <div className="hb-meeting-date-block">
                  <div className="day">{parts.day}</div>
                  <div className="month">{parts.month}</div>
                  <div className="weekday">{parts.weekday}</div>
                </div>

                <div className="hb-meeting-content">
                  <h4>
                    Reunião {m.type === "mensal" ? "mensal" : "extraordinária"}{" "}
                    · {formatLongDate(m.date)}
                  </h4>
                  <div className="hb-meeting-chair">
                    Preside: {m.chairName ?? "—"} · {parts.time}
                  </div>
                  <div className="hb-meeting-meta">
                    <span className={`hb-badge ${cfg.cls}`}>
                      <span className="hb-badge-dot" />
                      {cfg.label}
                    </span>
                  </div>
                  {m.notes && <div className="hb-meeting-note">{m.notes}</div>}
                </div>

                {isUpcoming && (
                  <div className="hb-meeting-actions">
                    <Button asChild size="sm" className="rounded-full">
                      <Link href={`/reunioes/${m.id}/editar`}>
                        <FileText size={13} aria-hidden="true" />
                        Editar pauta
                      </Link>
                    </Button>
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
