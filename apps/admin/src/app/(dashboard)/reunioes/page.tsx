"use client";

import * as React from "react";
import { Plus, CalendarDays, Info } from "lucide-react";
import type { MeetingSession } from "@hebron/types/admin";
import { mockMeetingSessions, mockUsers } from "../../../lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function MeetingStatusBadge({ status }: { status: MeetingSession["status"] }) {
  const config: Record<
    MeetingSession["status"],
    { label: string; bg: string; color: string }
  > = {
    scheduled: {
      label: "Agendada",
      bg: "var(--color-support-sky-muted)",
      color: "var(--color-support-sky)",
    },
    in_progress: {
      label: "Em andamento",
      bg: "var(--color-accent-muted)",
      color: "var(--color-accent)",
    },
    concluded: {
      label: "Realizada",
      bg: "var(--color-support-green-muted)",
      color: "var(--color-support-sky-foreground)",
    },
    cancelled: {
      label: "Cancelada",
      bg: "var(--color-destructive-muted)",
      color: "var(--color-destructive)",
    },
  };
  const { label, bg, color } = config[status];

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "0.125rem 0.5rem",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--font-weight-medium)",
        backgroundColor: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function MeetingTypeBadge({ type }: { type: MeetingSession["type"] }) {
  const isMonthly = type === "mensal";
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "0.125rem 0.5rem",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--font-weight-medium)",
        backgroundColor: isMonthly
          ? "var(--color-primary-muted)"
          : "var(--color-accent-muted)",
        color: isMonthly ? "var(--color-primary)" : "var(--color-accent)",
        whiteSpace: "nowrap",
      }}
    >
      {isMonthly ? "Mensal" : "Extraordinária"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReunioesPage() {
  const sorted = [...mockMeetingSessions].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  const scheduledCount = mockMeetingSessions.filter(
    (m) => m.status === "scheduled",
  ).length;

  const getUserName = (userId: string) =>
    mockUsers.find((u) => u.id === userId)?.name ?? userId;

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "56rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-foreground)",
            }}
          >
            Reuniões
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-muted-foreground)",
              marginTop: "0.25rem",
            }}
          >
            {scheduledCount > 0
              ? `${scheduledCount} agendada${scheduledCount !== 1 ? "s" : ""}`
              : "Nenhuma reunião agendada"}
          </p>
        </div>

        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-primary-foreground)",
            backgroundColor: "var(--color-primary)",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: "pointer",
          }}
        >
          <Plus size={16} aria-hidden="true" />
          Nova reunião
        </button>
      </div>

      {/* Auto-creation notice */}
      <div
        role="note"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.625rem",
          padding: "0.875rem 1rem",
          backgroundColor: "var(--color-primary-muted)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-subtle)",
        }}
      >
        <Info
          size={15}
          aria-hidden="true"
          style={{
            flexShrink: 0,
            marginTop: "0.125rem",
            color: "var(--color-primary)",
          }}
        />
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-primary)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          As reuniões mensais são criadas automaticamente na 1ª quarta-feira de
          cada mês. Você pode editar data, horário e presidente antes da
          realização.
        </p>
      </div>

      {/* Meetings list */}
      {sorted.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "var(--color-muted-foreground)",
          }}
        >
          <CalendarDays
            size={32}
            aria-hidden="true"
            style={{ margin: "0 auto 0.75rem", opacity: 0.4 }}
          />
          <p style={{ fontSize: "var(--text-sm)" }}>
            Nenhuma reunião registrada.
          </p>
        </div>
      ) : (
        <ul
          role="list"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {sorted.map((meeting) => (
            <li
              key={meeting.id}
              style={{
                backgroundColor: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              {/* Top row: date + badges */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-foreground)",
                      textTransform: "capitalize",
                    }}
                  >
                    {formatDateTime(meeting.date)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <MeetingTypeBadge type={meeting.type} />
                  <MeetingStatusBadge status={meeting.status} />
                </div>
              </div>

              {/* Chair */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-muted-foreground)",
                }}
              >
                <span>Presidente:</span>
                <span
                  style={{
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {getUserName(meeting.chairUserId)}
                </span>
              </div>

              {/* Notes */}
              {meeting.notes && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-muted-foreground)",
                    paddingTop: "0.625rem",
                    borderTop: "1px solid var(--color-border)",
                    lineHeight: "var(--leading-relaxed)",
                  }}
                >
                  {meeting.notes}
                </p>
              )}

              {/* Footer: created at + edit action */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid var(--color-border)",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  Criada em {formatShortDate(meeting.createdAt)}
                </span>
                {meeting.status === "scheduled" && (
                  <button
                    type="button"
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-primary)",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "0",
                    }}
                  >
                    Editar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
