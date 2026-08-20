"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { reservations, usageHistory } from "@hebron/db/schema";
import { gestorAction } from "../lib/safe-action";
import { logFlatsAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Check-in / check-out — presencial na recepção do condomínio (BRAIN §6.8):
// o sistema só registra a transição de status + timestamp, sem checklist de
// inventário (fora do escopo v1). Ambos os passos são operados pelo gestor
// (front desk), mesma designation de approval.ts.
// ---------------------------------------------------------------------------

const checkinTransitionSchema = z.object({
  reservationId: z.string().uuid(),
  occurredAt: z.coerce.date(),
  notes: z.string().max(1000).nullable().optional().default(null),
});

function toISODate(date: Date): string {
  const iso = date.toISOString().split("T")[0];
  if (!iso) throw new BusinessError("Data inválida");
  return iso;
}

export const checkIn = gestorAction
  .schema(checkinTransitionSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.reservationId))
        .limit(1);

      if (!reservation) throw new BusinessError("Reserva não encontrada");

      if (reservation.status !== "confirmada") {
        throw new BusinessError(
          `Só é possível fazer check-in em reservas confirmadas — status atual: "${reservation.status}"`,
        );
      }

      await tx
        .update(reservations)
        .set({
          status: "em_curso",
          managerNotes: input.notes ?? reservation.managerNotes,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservation.id));

      await withSystemRole(tx, (sysTx) =>
        logFlatsAudit(
          {
            actorId: ctx.actorId,
            action: "reservation.checked_in",
            entity: "reservation",
            entityId: reservation.id,
            diff: {
              status: { from: "confirmada", to: "em_curso" },
              occurredAt: input.occurredAt.toISOString(),
              notes: input.notes,
            },
          },
          sysTx,
        ),
      );

      return { reservationId: reservation.id };
    });
  });

export const checkOut = gestorAction
  .schema(checkinTransitionSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.reservationId))
        .limit(1);

      if (!reservation) throw new BusinessError("Reserva não encontrada");

      if (reservation.status !== "em_curso") {
        throw new BusinessError(
          `Só é possível fazer check-out em reservas em curso — status atual: "${reservation.status}"`,
        );
      }

      if (!reservation.selectedPeriod) {
        throw new BusinessError(
          "Reserva sem período confirmado — não é possível fazer check-out",
        );
      }

      await tx
        .update(reservations)
        .set({
          status: "concluida",
          managerNotes: input.notes ?? reservation.managerNotes,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservation.id));

      const start = new Date(`${reservation.selectedPeriod.start}T00:00:00Z`);
      const end = new Date(`${reservation.selectedPeriod.end}T00:00:00Z`);
      const daysUsed = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
      );

      await tx.insert(usageHistory).values({
        userId: reservation.requestedBy,
        reservationId: reservation.id,
        daysUsed,
        period: {
          start: toISODate(start),
          end: toISODate(end),
        },
      });

      await withSystemRole(tx, (sysTx) =>
        logFlatsAudit(
          {
            actorId: ctx.actorId,
            action: "reservation.checked_out",
            entity: "reservation",
            entityId: reservation.id,
            diff: {
              status: { from: "em_curso", to: "concluida" },
              occurredAt: input.occurredAt.toISOString(),
              notes: input.notes,
              daysUsed,
            },
          },
          sysTx,
        ),
      );

      return { reservationId: reservation.id, daysUsed };
    });
  });
