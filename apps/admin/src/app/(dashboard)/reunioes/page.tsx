"use client";

import * as React from "react";
import {
  Plus,
  CalendarDays,
  FileText,
  Mail,
  Download,
  Users,
  List,
} from "lucide-react";
import type { MeetingSession } from "@hebron/types/admin";
import { mockMeetingSessions, mockUsers } from "../../../lib/mock-data";

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

function getUserName(userId: string): string {
  return mockUsers.find((u) => u.id === userId)?.name ?? userId;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MeetingSession["status"],
  { label: string; cls: string }
> = {
  scheduled: { label: "Agendada", cls: "hb-status-agendada" },
  in_progress: { label: "Em andamento", cls: "hb-status-pending" },
  concluded: { label: "Realizada", cls: "hb-status-aceito" },
  cancelled: { label: "Cancelada", cls: "hb-status-suspended" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReunioesPage() {
  const [filter, setFilter] = React.useState<"upcoming" | "past">("upcoming");

  const upcoming = mockMeetingSessions
    .filter((m) => m.status === "scheduled" || m.status === "in_progress")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const past = mockMeetingSessions
    .filter((m) => m.status === "concluded" || m.status === "cancelled")
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const list = filter === "upcoming" ? upcoming : past;
  const nextMeeting = upcoming[0];

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
          <button className="hb-btn hb-btn-primary hb-btn-sm" type="button">
            <Plus size={14} aria-hidden="true" />
            Nova reunião
          </button>
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
              {getUserName(nextMeeting.chairUserId)}
            </div>
          </div>
          <div className="hb-next-meeting-banner-actions">
            <button className="hb-btn hb-btn-secondary hb-btn-sm" type="button">
              <FileText size={14} aria-hidden="true" />
              Ver pauta
            </button>
            <button className="hb-btn hb-btn-primary hb-btn-sm" type="button">
              <Mail size={14} aria-hidden="true" />
              Convocar
            </button>
          </div>
        </div>
      )}

      {/* Tab chips */}
      <div className="hb-chip-row">
        <button
          type="button"
          className={`hb-chip${filter === "upcoming" ? " active" : ""}`}
          onClick={() => setFilter("upcoming")}
        >
          Próximas <span className="hb-chip-count">· {upcoming.length}</span>
        </button>
        <button
          type="button"
          className={`hb-chip${filter === "past" ? " active" : ""}`}
          onClick={() => setFilter("past")}
        >
          Realizadas <span className="hb-chip-count">· {past.length}</span>
        </button>
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
            const cfg = STATUS_CONFIG[m.status] ?? { label: m.status, cls: "" };
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
                    Preside: {getUserName(m.chairUserId)} · {parts.time}
                  </div>
                  <div className="hb-meeting-meta">
                    <span className="hb-meeting-meta-item">
                      <Users size={12} aria-hidden="true" />
                      {((m as unknown as Record<string, unknown>)
                        .participantCount as number | undefined) ?? "—"}{" "}
                      convocados
                    </span>
                    <span className="hb-meeting-meta-item">
                      <List size={12} aria-hidden="true" />
                      {((m as unknown as Record<string, unknown>)
                        .agendaItemCount as number | undefined) ?? "—"}{" "}
                      pontos de pauta
                    </span>
                    <span className={`hb-badge ${cfg.cls}`}>
                      <span className="hb-badge-dot" />
                      {cfg.label}
                    </span>
                  </div>
                  {m.notes && <div className="hb-meeting-note">{m.notes}</div>}
                </div>

                <div className="hb-meeting-actions">
                  {isUpcoming ? (
                    <>
                      <button
                        className="hb-btn hb-btn-primary hb-btn-sm"
                        type="button"
                      >
                        <FileText size={13} aria-hidden="true" />
                        Editar pauta
                      </button>
                      <button
                        className="hb-btn hb-btn-ghost hb-btn-sm"
                        type="button"
                      >
                        <Mail size={13} aria-hidden="true" />
                        Reconvocar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="hb-btn hb-btn-secondary hb-btn-sm"
                        type="button"
                      >
                        <FileText size={13} aria-hidden="true" />
                        Ver ata
                      </button>
                      <button
                        className="hb-btn hb-btn-ghost hb-btn-sm"
                        type="button"
                      >
                        <Download size={13} aria-hidden="true" />
                        Baixar PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
