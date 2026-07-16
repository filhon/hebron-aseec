"use server";

import { eq } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { preferredPeriods, reservations } from "@hebron/db/schema";
import { reviewReservationSchema } from "@hebron/validators/flats";
import { gestorAction } from "../lib/safe-action";
import { logFlatsAudit } from "../lib/audit";

function toISODate(date: Date): string {
  const iso = date.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
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
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.reservationId))
        .limit(1);

      if (!reservation) throw new Error("Reserva não encontrada");

      if (reservation.status !== "solicitada") {
        throw new Error(
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

        return { reservationId: reservation.id, status: "rejeitada" as const };
      }

      // decision === "aprovada" — schema já garante unitId + confirmedPeriod
      // presentes (refine em reviewReservationSchema).
      if (!input.unitId || !input.confirmedPeriod) {
        throw new Error("Selecione a unidade e confirme o período");
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
        throw new Error(
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
          throw new Error(
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
    });
  });

// ---------------------------------------------------------------------------
// breakTie — desempate (BRAIN §6.8), nesta ordem: 1) idade (mais velho
// prioriza) 2) mais tempo sem descanso fora da cidade (critério f do
// scoring) 3) nunca usou o flat 4) sorteio.
//
// Função pura — não acessa o banco. A fila de aprovação (P-7.9, fora do
// escopo deste prompt) monta os candidatos a partir de guests (birthDate),
// scoring_responses (f_ultimo_descanso) e usage_history (nunca usou).
// ---------------------------------------------------------------------------

export type LastRestOutsideCity =
  | "mais_de_2_anos"
  | "entre_1_e_2_anos"
  | "menos_de_1_ano";

export interface TieBreakCandidate {
  reservationId: string;
  birthDate: Date;
  lastRestOutsideCity: LastRestOutsideCity;
  neverUsedFlat: boolean;
}

const REST_RANK: Record<LastRestOutsideCity, number> = {
  mais_de_2_anos: 2,
  entre_1_e_2_anos: 1,
  menos_de_1_ano: 0,
};

export function breakTie(
  candidates: TieBreakCandidate[],
): TieBreakCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  // 1) Idade — mais velho (menor birthDate) prioriza.
  const oldestBirthTime = Math.min(
    ...candidates.map((c) => c.birthDate.getTime()),
  );
  let pool = candidates.filter(
    (c) => c.birthDate.getTime() === oldestBirthTime,
  );
  if (pool.length === 1) return pool[0] ?? null;

  // 2) Mais tempo sem descanso fora da cidade.
  const maxRest = Math.max(
    ...pool.map((c) => REST_RANK[c.lastRestOutsideCity]),
  );
  pool = pool.filter((c) => REST_RANK[c.lastRestOutsideCity] === maxRest);
  if (pool.length === 1) return pool[0] ?? null;

  // 3) Nunca usou o flat.
  const neverUsed = pool.filter((c) => c.neverUsedFlat);
  if (neverUsed.length === 1) return neverUsed[0] ?? null;
  if (neverUsed.length > 1) pool = neverUsed;

  // 4) Sorteio.
  const winnerIndex = Math.floor(Math.random() * pool.length);
  return pool[winnerIndex] ?? null;
}
