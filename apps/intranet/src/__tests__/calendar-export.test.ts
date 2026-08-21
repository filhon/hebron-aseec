/**
 * calendar-export.test.ts — P-5.13 (PATCH-027): exportação unidirecional de
 * meeting_sessions para Google Calendar (URL de criação, sem OAuth) e .ics
 * (RFC 5545 mínimo). meeting_sessions não guarda horário de término, então
 * eventos sem `endAt` recebem 1h de duração padrão nos dois formatos.
 *
 * Local: src/__tests__/ (não src/lib/__tests__/ como no prompt original) —
 * vitest.config.ts de todo app do monorepo só inclui `src/__tests__/**`;
 * seguir o caminho do prompt deixaria o arquivo fora do include e o teste
 * nunca rodaria. Ajuste registrado em SESSIONS.md (G1).
 */
import { describe, it, expect } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildIcsFile,
  buildIcsDataUrl,
  type ExportableEvent,
} from "../lib/calendar-export";

const BASE_EVENT: ExportableEvent = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Reunião Diretoria",
  description: null,
  startAt: new Date("2026-09-10T14:00:00.000Z"),
  endAt: null,
  location: null,
};

describe("buildGoogleCalendarUrl", () => {
  it("aponta para o endpoint de criação de evento do Google, sem credenciais", () => {
    const url = new URL(buildGoogleCalendarUrl(BASE_EVENT));

    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Reunião Diretoria");
  });

  it("usa 1h de duração padrão quando a reunião não tem horário de término", () => {
    const url = new URL(buildGoogleCalendarUrl(BASE_EVENT));

    expect(url.searchParams.get("dates")).toBe(
      "20260910T140000Z/20260910T150000Z",
    );
  });

  it("usa o endAt informado quando presente", () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        ...BASE_EVENT,
        endAt: new Date("2026-09-10T16:30:00.000Z"),
      }),
    );

    expect(url.searchParams.get("dates")).toBe(
      "20260910T140000Z/20260910T163000Z",
    );
  });

  it("inclui details e location apenas quando presentes", () => {
    const withoutExtras = new URL(buildGoogleCalendarUrl(BASE_EVENT));
    expect(withoutExtras.searchParams.has("details")).toBe(false);
    expect(withoutExtras.searchParams.has("location")).toBe(false);

    const withExtras = new URL(
      buildGoogleCalendarUrl({
        ...BASE_EVENT,
        description: "Pauta: orçamento anual",
        location: "Sala 2",
      }),
    );
    expect(withExtras.searchParams.get("details")).toBe(
      "Pauta: orçamento anual",
    );
    expect(withExtras.searchParams.get("location")).toBe("Sala 2");
  });
});

describe("buildIcsFile", () => {
  it("gera um VEVENT parseável com os campos mínimos do RFC 5545", () => {
    const ics = buildIcsFile(BASE_EVENT);
    const lines = ics.split("\r\n");

    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("DTSTART:20260910T140000Z");
    expect(lines).toContain("DTEND:20260910T150000Z");
    expect(lines).toContain("SUMMARY:Reunião Diretoria");
    expect(lines).toContain("END:VEVENT");
    expect(lines[lines.length - 1]).toBe("END:VCALENDAR");
  });

  it("inclui UID estável derivado do id do evento", () => {
    const ics = buildIcsFile(BASE_EVENT);
    expect(ics).toContain(
      "UID:11111111-1111-1111-1111-111111111111@intranet.hebronaseec.com.br",
    );
  });

  it("inclui DESCRIPTION e LOCATION apenas quando presentes, com escape de vírgula/ponto-e-vírgula", () => {
    const withoutExtras = buildIcsFile(BASE_EVENT);
    expect(withoutExtras).not.toContain("DESCRIPTION:");
    expect(withoutExtras).not.toContain("LOCATION:");

    const withExtras = buildIcsFile({
      ...BASE_EVENT,
      description: "Pauta: item 1, item 2; item 3",
      location: "Sala 2",
    });
    expect(withExtras).toContain(
      "DESCRIPTION:Pauta: item 1\\, item 2\\; item 3",
    );
    expect(withExtras).toContain("LOCATION:Sala 2");
  });
});

describe("buildIcsDataUrl", () => {
  it("retorna um data URI de text/calendar com o conteúdo do .ics codificado", () => {
    const dataUrl = buildIcsDataUrl(BASE_EVENT);

    expect(dataUrl.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);
    const decoded = decodeURIComponent(
      dataUrl.slice("data:text/calendar;charset=utf-8,".length),
    );
    expect(decoded).toBe(buildIcsFile(BASE_EVENT));
  });
});
