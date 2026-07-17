/**
 * radio-stats.test.ts — runRadioStatsAggregation (P-8.11)
 *
 * Semântica D-3: "ouvinte" = sessão com >= 2 heartbeats; hoursListened soma
 * TODOS os heartbeats (1 heartbeat ≈ 60s), independente do limiar de
 * "ouvinte". Heartbeats brutos são apagados incondicionalmente ao final
 * (LGPD — sem rastro individual).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  authors,
  tracks,
  listenerHeartbeats,
  listenerStats,
} from "@hebron/db/schema";
import { runRadioStatsAggregation } from "../crons/radio-stats";
import { functions } from "../index";

const IDS = {
  author: "8a110000-0000-0000-0000-000000000001",
  track: "8a110000-0000-0000-0000-000000000002",
};

function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
  return iso;
}

async function insertHeartbeats(sessionId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await db
      .insert(listenerHeartbeats)
      .values({ sessionId, trackId: IDS.track });
  }
}

beforeAll(async () => {
  await db
    .insert(authors)
    .values({ id: IDS.author, name: "Autor Teste Rádio Stats" })
    .onConflictDoNothing();
  await db
    .insert(tracks)
    .values({
      id: IDS.track,
      title: "Faixa Teste Rádio Stats",
      authorId: IDS.author,
      fileUrl: "sermons/radio-stats-test.mp3",
      durationSeconds: 1800,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(listenerStats).where(eq(listenerStats.date, yesterdayISO()));
  await db.delete(tracks).where(eq(tracks.id, IDS.track));
  await db.delete(authors).where(eq(authors.id, IDS.author));
});

describe("runRadioStatsAggregation", () => {
  it("está registrado no catálogo de funções Inngest", () => {
    expect(functions.some((fn) => fn.id() === "radio-audiencia-snapshot")).toBe(
      true,
    );
  });

  it("calcula sessões únicas/dia e horas ouvidas/dia a partir dos heartbeats, e apaga os brutos", async () => {
    // sessionA: 3 heartbeats (ouvinte), sessionB: 1 (não conta como ouvinte,
    // mas soma no tempo ouvido), sessionC: 2 (ouvinte). Total = 6 heartbeats.
    await insertHeartbeats("session-a", 3);
    await insertHeartbeats("session-b", 1);
    await insertHeartbeats("session-c", 2);

    const result = await runRadioStatsAggregation();

    expect(result.date).toBe(yesterdayISO());
    expect(result.uniqueSessions).toBe(2);
    expect(result.hoursListened).toBeCloseTo(0.1, 5);

    const [row] = await db
      .select()
      .from(listenerStats)
      .where(eq(listenerStats.date, yesterdayISO()));
    expect(row?.uniqueSessions).toBe(2);
    expect(Number(row?.hoursListened)).toBeCloseTo(0.1, 5);

    const remaining = await db
      .select()
      .from(listenerHeartbeats)
      .where(eq(listenerHeartbeats.trackId, IDS.track));
    expect(remaining.length).toBe(0);
  });

  it("é idempotente — reprocessar o mesmo dia sem novos heartbeats zera a linha existente, sem duplicar", async () => {
    const before = await db
      .select()
      .from(listenerStats)
      .where(eq(listenerStats.date, yesterdayISO()));
    expect(before.length).toBe(1);

    const result = await runRadioStatsAggregation();
    expect(result.uniqueSessions).toBe(0);
    expect(result.hoursListened).toBe(0);

    const after = await db
      .select()
      .from(listenerStats)
      .where(eq(listenerStats.date, yesterdayISO()));
    expect(after.length).toBe(1);
  });
});
