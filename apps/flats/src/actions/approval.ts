"use server";

import { eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { preferredPeriods, reservations } from "@hebron/db/schema";
import { reviewReservationSchema } from "@hebron/validators/flats";
import { gestorAction } from "../lib/safe-action";
import { logFlatsAudit } from "../lib/audit";
import { notifyReservationDecision } from "../lib/notifications";

function toISODate(date: Date): string {
  const iso = date.toISOString().split("T")[0];
  if (!iso) throw new BusinessError("Data inválida");
  return iso;
}

// ---------------------------------------------------------------------------
// reviewReservation — diretor gestor aprova (com unidade + 1 dos 3 períodos
// de preferência) ou rejeita uma reserva "solicitada" (BRAIN §6.8). O
// EXCLUDE USING gist de flats.reservations (0021_flats.sql) é a última
// linha de defesa contra double-booking — capturamos a violação e devolvemos
// uma mensagem legível em vez do erro cru do Postgres.
// ---------------------------------------------------------------------------

export const reviewReservation = gestorAction
  .schema(reviewReservationSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const result = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [reservation] = await tx
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        if (!reservation) throw new BusinessError("Reserva não encontrada");

        if (reservation.status !== "solicitada") {
          throw new BusinessError(
            `Só é possível aprovar/rejeitar reservas com status "solicitada" — status atual: "${reservation.status}"`,
          );
        }

        const now = new Date();

        if (input.decision === "rejeitada") {
          await tx
            .update(reservations)
            .set({
              status: "rejeitada",
              reviewedBy: ctx.actorId,
              reviewedAt: now,
              managerNotes: input.managerNotes,
              updatedAt: now,
            })
            .where(eq(reservations.id, reservation.id));

          await withSystemRole(tx, (sysTx) =>
            logFlatsAudit(
              {
                actorId: ctx.actorId,
                action: "reservation.rejected",
                entity: "reservation",
                entityId: reservation.id,
                diff: {
                  status: { from: "solicitada", to: "rejeitada" },
                  managerNotes: input.managerNotes,
                },
              },
              sysTx,
            ),
          );

          return {
            reservationId: reservation.id,
            status: "rejeitada" as const,
          };
        }

        // decision === "aprovada" — schema já garante unitId + confirmedPeriod
        // presentes (refine em reviewReservationSchema).
        if (!input.unitId || !input.confirmedPeriod) {
          throw new BusinessError("Selecione a unidade e confirme o período");
        }

        const confirmedStart = toISODate(input.confirmedPeriod.start);
        const confirmedEnd = toISODate(input.confirmedPeriod.end);

        const candidatePeriods = await tx
          .select({ period: preferredPeriods.period })
          .from(preferredPeriods)
          .where(eq(preferredPeriods.reservationId, reservation.id));

        const matchesPreference = candidatePeriods.some(
          (row) =>
            row.period.start === confirmedStart &&
            row.period.end === confirmedEnd,
        );

        if (!matchesPreference) {
          throw new BusinessError(
            "O período confirmado deve ser um dos 3 períodos de preferência do hóspede",
          );
        }

        try {
          await tx
            .update(reservations)
            .set({
              status: "aprovada",
              unitId: input.unitId,
              selectedPeriod: {
                start: toISODate(input.confirmedPeriod.start),
                end: toISODate(input.confirmedPeriod.end),
              },
              reviewedBy: ctx.actorId,
              reviewedAt: now,
              managerNotes: input.managerNotes,
              updatedAt: now,
            })
            .where(eq(reservations.id, reservation.id));
        } catch (err) {
          if (err instanceof Error && /exclu(sion|de)/i.test(err.message)) {
            throw new BusinessError(
              "Conflito de datas: a unidade já está ocupada nesse período",
            );
          }
          throw err;
        }

        await withSystemRole(tx, (sysTx) =>
          logFlatsAudit(
            {
              actorId: ctx.actorId,
              action: "reservation.approved",
              entity: "reservation",
              entityId: reservation.id,
              diff: {
                status: { from: "solicitada", to: "aprovada" },
                unitId: input.unitId,
                managerNotes: input.managerNotes,
              },
            },
            sysTx,
          ),
        );

        return { reservationId: reservation.id, status: "aprovada" as const };
      },
    );

    // Email ao hóspede com a decisão (P-7.10) — fiação que faltava desde
    // P-7.10 (lista de arquivos permitidos daquele prompt não incluía este
    // arquivo; registrado em SESSIONS.md como débito de P-7.11). Best-effort:
    // uma falha aqui não desfaz a decisão já commitada, só fica registrada
    // no log estruturado.
    try {
      await notifyReservationDecision(result.reservationId, result.status);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "cross_app_integration_failure",
          integration: "flats.notifyReservationDecision",
          caller: "flats/actions/approval.ts::reviewReservation",
          reservationId: result.reservationId,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    return result;
  });

// breakTie (desempate, BRAIN §6.8) foi movido para lib/tie-break.ts em
// P-7.9 — módulos "use server" só podem exportar funções async quando
// alcançados a partir de um Client Component, e approval-form.tsx passou a
// importar reviewReservation diretamente.
