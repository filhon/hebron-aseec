"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  reservations,
  preferredPeriods,
  flatsGuests as guests,
  flatsVehicles as vehicles,
  scoringResponses,
  usageHistory,
} from "@hebron/db/schema";
import { onFlatsReservationConfirmed } from "@hebron/integrations/flats";
import { createReservationRequestSchema } from "@hebron/validators/flats";
import { flatsAction, hospedeAction } from "../lib/safe-action";
import { logFlatsAudit } from "../lib/audit";
import { computeScoringResponses } from "./scoring";
import { createAidRequest } from "./aid";

// ---------------------------------------------------------------------------
// Ciclo de vida da reserva: criar, confirmar (aprovada → confirmada, dispara
// as tarefas de limpeza via packages/integrations) e cancelar (soft-delete
// com justificativa — status → 'cancelada', BRAIN "Imutabilidade": nunca
// hard delete, sem policy de DELETE em flats.reservations, 0022_flats_rls.sql).
//
// Aprovar/rejeitar (com seleção de período + unidade) fica em approval.ts;
// check-in/check-out em checkin.ts.
// ---------------------------------------------------------------------------

const MAX_DAYS_PER_12_MONTHS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TWELVE_MONTHS_MS = MS_PER_DAY * 365;

function toISODate(date: Date): string {
  const iso = date.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
  return iso;
}

/**
 * Máx. 7 dias consecutivos por período de 12 meses, POR INDIVÍDUO (BRAIN
 * §6.8, Respostas7.md Q140) — soma flats.usage_history.days_used do
 * requerente nos últimos 12 meses. usage_history.user_id é sempre o
 * requestedBy da reserva original (guests.user_id pode ser nulo quando o
 * responsável não tem conta — suposição registrada em SESSIONS.md).
 */
async function usedDaysInLast12Months(
  tx: AuthenticatedTx,
  userId: string,
  referenceDate: Date,
): Promise<number> {
  const rows = await tx
    .select({ daysUsed: usageHistory.daysUsed, period: usageHistory.period })
    .from(usageHistory)
    .where(eq(usageHistory.userId, userId));

  const cutoff = referenceDate.getTime() - TWELVE_MONTHS_MS;

  return rows.reduce((sum, row) => {
    const start = new Date(`${row.period.start}T00:00:00Z`).getTime();
    return start >= cutoff ? sum + row.daysUsed : sum;
  }, 0);
}

export const createReservation = hospedeAction
  .schema(createReservationRequestSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // Elegibilidade (BRAIN §6.8): diretor/conselheiro NUNCA podem se
    // hospedar, mesmo que também tenham papel hospede (papéis não são
    // exclusivos) — mesma regra de reservations_insert_own
    // (0022_flats_rls.sql), replicada aqui para uma mensagem de erro clara
    // em vez de deixar a RLS rejeitar com um erro genérico de Postgres.
    if (ctx.roles.includes("diretor") || ctx.roles.includes("conselheiro")) {
      throw new Error(
        "Diretores e conselheiros não podem solicitar hospedagem nos flats (conflito de interesse)",
      );
    }

    const now = new Date();

    const result = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const usedDays = await usedDaysInLast12Months(tx, ctx.actorId, now);
        if (usedDays >= MAX_DAYS_PER_12_MONTHS) {
          throw new Error(
            `Limite de ${MAX_DAYS_PER_12_MONTHS} dias de hospedagem nos últimos 12 meses já atingido (${usedDays} dia(s) usados)`,
          );
        }

        const [reservation] = await tx
          .insert(reservations)
          .values({
            requestedBy: ctx.actorId,
            status: "solicitada",
            purpose: input.purpose,
            arrivesByCar: input.arrivesByCar,
          })
          .returning();

        if (!reservation) throw new Error("Falha ao criar reserva");

        await tx.insert(preferredPeriods).values(
          input.preferredPeriods.map((period, index) => ({
            reservationId: reservation.id,
            period: {
              start: toISODate(period.start),
              end: toISODate(period.end),
            },
            rank: index + 1,
          })),
        );

        const [responsible] = await tx
          .insert(guests)
          .values({
            reservationId: reservation.id,
            userId: ctx.actorId,
            name: input.guest.responsibleName,
            cpf: input.guest.responsibleCpf,
            birthDate: toISODate(input.guest.responsibleBirthDate),
            isResponsible: true,
            isUnder3: false,
            email: input.guest.responsibleEmail,
            phone: input.guest.responsiblePhone,
            ministryType: input.guest.ministryType,
            ministryStartDate: toISODate(input.guest.ministryStartDate),
          })
          .returning();

        if (!responsible) throw new Error("Falha ao criar hóspede responsável");

        const companionRows = [
          ...input.guest.companions,
          ...input.guest.youngChildren,
        ];

        if (companionRows.length > 0) {
          await tx.insert(guests).values(
            companionRows.map((companion) => ({
              reservationId: reservation.id,
              name: companion.name,
              cpf: companion.cpf,
              birthDate: toISODate(companion.birthDate),
              isResponsible: false,
              isUnder3: companion.isUnder3,
            })),
          );
        }

        if (input.arrivesByCar && input.vehicle) {
          await tx.insert(vehicles).values({
            reservationId: reservation.id,
            plate: input.vehicle.plate,
            color: input.vehicle.color,
            model: input.vehicle.model,
            brand: input.vehicle.brand,
          });
        }

        const { responses, totalPoints } = await computeScoringResponses({
          tx,
          userId: ctx.actorId,
          ministryStartDate: input.guest.ministryStartDate,
          answers: input.scoringAnswers,
          referenceDate: now,
        });

        await tx.insert(scoringResponses).values(
          responses.map((response) => ({
            reservationId: reservation.id,
            ...response,
          })),
        );

        await tx
          .update(reservations)
          .set({ scoreTotal: totalPoints, updatedAt: now })
          .where(eq(reservations.id, reservation.id));

        if (input.aidRequest) {
          await createAidRequest(
            tx,
            ctx.actorId,
            reservation.id,
            input.aidRequest,
          );
        }

        await withSystemRole(tx, (sysTx) =>
          logFlatsAudit(
            {
              actorId: ctx.actorId,
              action: "reservation.submitted",
              entity: "reservation",
              entityId: reservation.id,
              diff: {
                scoreTotal: totalPoints,
                preferredPeriodsCount: input.preferredPeriods.length,
                hasAidRequest: input.aidRequest !== null,
              },
            },
            sysTx,
          ),
        );

        return { reservationId: reservation.id, scoreTotal: totalPoints };
      },
    );

    return result;
  });

// ---------------------------------------------------------------------------
// confirmReservation — aprovada → confirmada. Suposição (G1, ambiguidade
// registrada em SESSIONS.md): BRAIN §6.8 lista "confirmar reserva" como
// passo distinto de "aprovar" (que já escolhe unidade + período,
// approval.ts) e de check-in; a ação mais simples é o próprio hóspede (ou o
// gestor, em nome dele) confirmar que comparecerá, travando o período antes
// do check-in presencial. Dispara onFlatsReservationConfirmed (Flats →
// Tarefas, stub — implementação real em P-7.11).
// ---------------------------------------------------------------------------

const confirmReservationSchema = z.object({
  reservationId: z.string().uuid(),
});

export const confirmReservation = flatsAction
  .schema(confirmReservationSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const reservationId = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [reservation] = await tx
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        if (!reservation) throw new Error("Reserva não encontrada");

        const isOwner = reservation.requestedBy === ctx.actorId;
        const isGestor =
          ctx.roles.includes("super_admin") ||
          (ctx.roles.includes("diretor") &&
            ctx.designations.includes("gestor"));

        if (!isOwner && !isGestor) {
          throw new Error(
            "Acesso negado: só o hóspede ou o gestor podem confirmar",
          );
        }

        if (reservation.status !== "aprovada") {
          throw new Error(
            `Só é possível confirmar reservas aprovadas — status atual: "${reservation.status}"`,
          );
        }

        await tx
          .update(reservations)
          .set({ status: "confirmada", updatedAt: new Date() })
          .where(eq(reservations.id, reservation.id));

        await withSystemRole(tx, (sysTx) =>
          logFlatsAudit(
            {
              actorId: ctx.actorId,
              action: "reservation.confirmed",
              entity: "reservation",
              entityId: reservation.id,
              diff: { status: { from: "aprovada", to: "confirmada" } },
            },
            sysTx,
          ),
        );

        return reservation.id;
      },
    );

    await onFlatsReservationConfirmed(reservationId);

    return { reservationId };
  });

// ---------------------------------------------------------------------------
// cancelReservation — soft-delete com justificativa (BRAIN "Imutabilidade":
// nunca hard delete). Não há coluna de justificativa em flats.reservations
// — a razão fica registrada no diff do audit log, que é o registro
// imutável e auditável exigido (suposição simples, G1; registrada em
// SESSIONS.md). Alcançável de qualquer status não-terminal.
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(["concluida", "cancelada", "rejeitada"]);

const cancelReservationSchema = z.object({
  reservationId: z.string().uuid(),
  reason: z
    .string()
    .min(10, "Justifique o cancelamento (mínimo 10 caracteres)")
    .max(1000),
});

export const cancelReservation = flatsAction
  .schema(cancelReservationSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.reservationId))
        .limit(1);

      if (!reservation) throw new Error("Reserva não encontrada");

      const isOwner = reservation.requestedBy === ctx.actorId;
      const isGestor =
        ctx.roles.includes("super_admin") ||
        (ctx.roles.includes("diretor") && ctx.designations.includes("gestor"));

      if (!isOwner && !isGestor) {
        throw new Error(
          "Acesso negado: só o hóspede ou o gestor podem cancelar",
        );
      }

      if (TERMINAL_STATUSES.has(reservation.status)) {
        throw new Error(
          `Reserva em status "${reservation.status}" não pode ser cancelada`,
        );
      }

      await tx
        .update(reservations)
        .set({ status: "cancelada", updatedAt: new Date() })
        .where(eq(reservations.id, reservation.id));

      await withSystemRole(tx, (sysTx) =>
        logFlatsAudit(
          {
            actorId: ctx.actorId,
            action: "reservation.cancelled",
            entity: "reservation",
            entityId: reservation.id,
            diff: {
              status: { from: reservation.status, to: "cancelada" },
              reason: input.reason,
            },
          },
          sysTx,
        ),
      );

      return { reservationId: reservation.id };
    });
  });
