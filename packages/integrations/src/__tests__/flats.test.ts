/**
 * flats.test.ts — onFlatsReservationConfirmed, Flats → Tarefas (P-7.11)
 *
 * Sem mock: roda contra o banco real. Cobre o critério de aceite "reserva
 * confirmada cria as 2 tarefas SEM assignee, com datas derivadas do
 * período" — os templates de limpeza são resolvidos por nome estável
 * (seedFlatsCleaningTemplates, packages/db/src/seed/tarefas-templates.ts),
 * nunca por UUID.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { reservations, tasks, users } from "@hebron/db/schema";
import { seedFlatsCleaningTemplates } from "@hebron/db/seed/tarefas-templates";
import { onFlatsReservationConfirmed } from "../flats";

const REQUESTER_ID = "f7110000-0000-0000-0000-000000000001";
const REQUESTER_EMAIL = "flats-cross-test-requester@test.hebron";
const RESERVATION_ID = "f7110000-0000-0000-0000-0000000000f1";

// O customType `daterange` (packages/db/src/schema/flats.ts) grava com
// limites inclusivos ("[start,end]"), mas o Postgres sempre canonicaliza
// daterange para a forma [início,fim) — o limite superior lido de volta do
// banco é sempre "end + 1 dia" em relação ao valor inserido. Para que
// `onFlatsReservationConfirmed` leia `selectedPeriod.end` = "2026-08-15"
// (o check-out esperado neste teste), o valor inserido precisa ser
// "2026-08-14".
const SELECTED_PERIOD = { start: "2026-08-10", end: "2026-08-14" };

beforeAll(async () => {
  await seedFlatsCleaningTemplates();

  await db
    .insert(users)
    .values({
      id: REQUESTER_ID,
      email: REQUESTER_EMAIL,
      fullName: "Flats Cross Test Requester",
    })
    .onConflictDoNothing();

  await db
    .insert(reservations)
    .values({
      id: RESERVATION_ID,
      requestedBy: REQUESTER_ID,
      status: "confirmada",
      selectedPeriod: SELECTED_PERIOD,
      purpose: "Descanso ministerial",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(tasks)
    .where(sql`${tasks.sourceRef} ->> 'sourceId' = ${RESERVATION_ID}`);
  await db.delete(reservations).where(eq(reservations.id, RESERVATION_ID));
  await db.delete(users).where(eq(users.id, REQUESTER_ID));
});

describe("onFlatsReservationConfirmed", () => {
  it("cria as 2 tarefas de limpeza sem responsável, com datas derivadas do período", async () => {
    await onFlatsReservationConfirmed(RESERVATION_ID);

    const createdTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.sourceRef} ->> 'sourceId' = ${RESERVATION_ID}`);

    expect(createdTasks.length).toBe(2);

    for (const task of createdTasks) {
      expect(task.source).toBe("auto");
      expect(task.needsManualAssignment).toBe(true);
      expect(task.sourceRef).toEqual({
        sourceModule: "flats",
        sourceId: RESERVATION_ID,
      });
    }

    const preTask = createdTasks.find((t) => /pré-estadia/.test(t.title));
    const postTask = createdTasks.find((t) => /pós-estadia/.test(t.title));

    expect(preTask?.dueDate?.toISOString().split("T")[0]).toBe("2026-08-09");
    expect(postTask?.dueDate?.toISOString().split("T")[0]).toBe("2026-08-16");
  });
});
