import type { CalendarEvent } from "@hebron/types/intranet";

/**
 * meeting_sessions não guarda horário de término — o Google Calendar e o
 * arquivo .ics exigem DTEND, então eventos sem `endAt` recebem 1h de duração
 * padrão (P-5.13).
 */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export type ExportableEvent = Pick<
  CalendarEvent,
  "id" | "title" | "description" | "startAt" | "endAt" | "location"
>;

function resolveEnd(event: ExportableEvent): Date {
  return event.endAt ?? new Date(event.startAt.getTime() + DEFAULT_DURATION_MS);
}

function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl(event: ExportableEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toUtcStamp(event.startAt)}/${toUtcStamp(resolveEnd(event))}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcsFile(event: ExportableEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hebron Aseec//Intranet//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@intranet.hebronaseec.com.br`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(event.startAt)}`,
    `DTEND:${toUtcStamp(resolveEnd(event))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export function buildIcsDataUrl(event: ExportableEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcsFile(event))}`;
}
