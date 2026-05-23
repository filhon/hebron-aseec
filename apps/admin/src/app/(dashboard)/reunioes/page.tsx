"use client";

import * as React from "react";
import { Plus, CalendarDays, Info } from "lucide-react";
import { PageHeader, EmptyState, Button } from "@hebron/ui";
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
      color: "var(--color-support-green-foreground)",
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
      <PageHeader
        title="Reuniões"
        description={
          scheduledCount > 0
            ? `${scheduledCount} agendada${scheduledCount !== 1 ? "s" : ""}`
            : "Nenhuma reunião agendada"
        }
        actions={
          <Button leftIcon={<Plus size={16} aria-hidden="true" />}>
            Nova reunião
          </Button>
        }
      />

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
        <EmptyState
          title="Nenhuma reunião registrada."
          icon={CalendarDays}
          quote={{
            text: "Onde dois ou três estiverem reunidos em meu nome, aí estou no meio deles",
            reference: "Mateus 18:20",
          }}
        />
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
                  <Button type="button" variant="link" size="xs">
                    Editar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
