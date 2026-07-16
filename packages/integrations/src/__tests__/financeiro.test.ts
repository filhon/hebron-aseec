/**
 * financeiro.test.ts — onFlatsAssistanceApproved, Flats → Financeiro (D-4)
 *
 * Sem mock: roda contra o banco real. A implementação (onFlatsAssistanceApproved)
 * nasceu em P-7.8; este teste cobre o critério de aceite de P-7.11 "ajuda
 * aprovada → payables não aprovados no Financeiro" — a despesa nasce
 * `status = 'pendente'` (default do schema, financeiro.payables), nunca já
 * aprovada, seguindo a governança dual (D-4: gestor aprova, autorizador
 * autoriza em lote separado).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { aidRequests, payables, reservations, users } from "@hebron/db/schema";
import { onFlatsAssistanceApproved } from "../financeiro";

const REQUESTER_ID = "f7110000-0000-0000-0000-000000000002";
const REQUESTER_EMAIL = "flats-cross-test-financeiro@test.hebron";
const RESERVATION_ID = "f7110000-0000-0000-0000-0000000000f2";
const AID_REQUEST_ID = "f7110000-0000-0000-0000-0000000000a2";

let createdPayableId: string | undefined;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: REQUESTER_ID,
      email: REQUESTER_EMAIL,
      fullName: "Flats Cross Test Financeiro",
    })
    .onConflictDoNothing();

  await db
    .insert(reservations)
    .values({
      id: RESERVATION_ID,
      requestedBy: REQUESTER_ID,
      status: "confirmada",
      selectedPeriod: { start: "2026-09-10", end: "2026-09-15" },
      purpose: "Descanso ministerial",
    })
    .onConflictDoNothing();

  await db
    .insert(aidRequests)
    .values({
      id: AID_REQUEST_ID,
      reservationId: RESERVATION_ID,
      requestsDailyAllowance: true,
      status: "aprovado",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  if (createdPayableId) {
    await db.delete(payables).where(eq(payables.id, createdPayableId));
  }
  await db.delete(aidRequests).where(eq(aidRequests.id, AID_REQUEST_ID));
  await db.delete(reservations).where(eq(reservations.id, RESERVATION_ID));
  await db.delete(users).where(eq(users.id, REQUESTER_ID));
});

describe("onFlatsAssistanceApproved", () => {
  it("cria a despesa em financeiro.payables como pendente (D-4: governança dual)", async () => {
    const result = await onFlatsAssistanceApproved({
      reservationId: RESERVATION_ID,
      aidRequestId: AID_REQUEST_ID,
      dailyAllowanceAmount: 500,
      transportAmount: null,
    });

    expect(result).not.toBeNull();
    createdPayableId = result?.payableId;

    const [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, createdPayableId as string));

    expect(payable).toBeDefined();
    expect(payable?.status).toBe("pendente");
    expect(payable?.amount).toBe("500.00");
    expect(payable?.dueDate).toBe("2026-09-09");

    const [aidRequest] = await db
      .select({ financeiroExpenseId: aidRequests.financeiroExpenseId })
      .from(aidRequests)
      .where(eq(aidRequests.id, AID_REQUEST_ID));

    expect(aidRequest?.financeiroExpenseId).toBe(createdPayableId);
  });
});
