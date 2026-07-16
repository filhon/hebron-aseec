"use server";

import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { aidRequests, reservations } from "@hebron/db/schema";
import { onFlatsAssistanceApproved } from "@hebron/integrations/financeiro";
import { reviewAidRequestSchema } from "@hebron/validators/flats";
import type { aidRequestSchema } from "@hebron/validators/flats";
import { gestorAction } from "../lib/safe-action";
import { logFlatsAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Auxílio opcional (diária fixa + transporte), aprovado caso a caso (BRAIN
// §6.8). createAidRequest é um helper interno chamado por
// reservations.ts::createReservation dentro da mesma transação — não existe
// fluxo de "solicitar auxílio" separado da criação da reserva (o wizard de
// P-7.4 já coleta os dois juntos). reviewAidRequest (aprovar/rejeitar) é a
// única Server Action pública deste arquivo.
// ---------------------------------------------------------------------------

const AEREO_AMOUNT_PER_PASSENGER = 1000;

type AidRequestInput = z.infer<typeof aidRequestSchema>;

export async function createAidRequest(
  tx: AuthenticatedTx,
  actorId: string,
  reservationId: string,
  input: AidRequestInput,
): Promise<void> {
  const transportAmount =
    input.transportMode === "aereo"
      ? (input.transportPassengerCount ?? 0) * AEREO_AMOUNT_PER_PASSENGER
      : null;

  const [aidRequest] = await tx
    .insert(aidRequests)
    .values({
      reservationId,
      requestsDailyAllowance: input.requestsDailyAllowance,
      transportMode: input.transportMode,
      transportPassengerCount: input.transportPassengerCount,
      transportAmount:
        transportAmount !== null ? transportAmount.toFixed(2) : null,
      status: "solicitado",
    })
    .returning();

  if (!aidRequest) throw new Error("Falha ao criar solicitação de auxílio");

  await withSystemRole(tx, (sysTx) =>
    logFlatsAudit(
      {
        actorId,
        action: "aid.requested",
        entity: "aid_request",
        entityId: aidRequest.id,
        diff: {
          requestsDailyAllowance: input.requestsDailyAllowance,
          transportMode: input.transportMode,
        },
      },
      sysTx,
    ),
  );
}

// ---------------------------------------------------------------------------
// reviewAidRequest — diretor gestor aprova/rejeita (mesma designation de
// approval.ts, RLS aid_requests_update_gestor em 0022_flats_rls.sql).
//
// Aéreo: valor é sempre passageiros × R$1.000 (BRAIN §6.8), calculado e
// travado na criação (createAidRequest) — o input de transportAmount é
// ignorado para não permitir que a aprovação sobrescreva a fórmula
// determinística. Combustível: valor é definido pelo gestor na aprovação
// (sem fórmula no BRAIN). Diária fixa: valor é definido pelo gestor na
// aprovação (sem fórmula/tabela de preço no BRAIN nem tabela pricing_rules
// — fora do escopo v1, .docs/Claude.md revogação).
// ---------------------------------------------------------------------------

export const reviewAidRequest = gestorAction
  .schema(reviewAidRequestSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const result = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [aidRequest] = await tx
          .select()
          .from(aidRequests)
          .where(eq(aidRequests.id, input.aidRequestId))
          .limit(1);

        if (!aidRequest)
          throw new Error("Solicitação de auxílio não encontrada");

        if (aidRequest.status !== "solicitado") {
          throw new Error(
            `Esta solicitação já foi revisada — status atual: "${aidRequest.status}"`,
          );
        }

        const now = new Date();

        if (input.decision === "rejeitado") {
          await tx
            .update(aidRequests)
            .set({
              status: "rejeitado",
              reviewedBy: ctx.actorId,
              reviewedAt: now,
              updatedAt: now,
            })
            .where(eq(aidRequests.id, aidRequest.id));

          await withSystemRole(tx, (sysTx) =>
            logFlatsAudit(
              {
                actorId: ctx.actorId,
                action: "aid.rejected",
                entity: "aid_request",
                entityId: aidRequest.id,
                diff: { status: { from: "solicitado", to: "rejeitado" } },
              },
              sysTx,
            ),
          );

          return { approved: false as const };
        }

        if (aidRequest.requestsDailyAllowance && !input.dailyAllowanceAmount) {
          throw new Error("Informe o valor da diária fixa para aprovar");
        }

        if (
          aidRequest.transportMode === "combustivel" &&
          !input.transportAmount
        ) {
          throw new Error(
            "Informe o valor do transporte (combustível) para aprovar",
          );
        }

        const dailyAllowanceAmount = aidRequest.requestsDailyAllowance
          ? input.dailyAllowanceAmount
          : null;

        // Aéreo mantém o valor calculado na criação (passageiros × R$1.000);
        // combustível usa o valor informado agora pelo gestor.
        const transportAmount =
          aidRequest.transportMode === "aereo"
            ? aidRequest.transportAmount
              ? parseFloat(aidRequest.transportAmount)
              : null
            : aidRequest.transportMode === "combustivel"
              ? input.transportAmount
              : null;

        await tx
          .update(aidRequests)
          .set({
            status: "aprovado",
            reviewedBy: ctx.actorId,
            reviewedAt: now,
            updatedAt: now,
            dailyAllowanceAmount:
              dailyAllowanceAmount !== null
                ? dailyAllowanceAmount.toFixed(2)
                : null,
            transportAmount:
              transportAmount !== null ? transportAmount.toFixed(2) : null,
          })
          .where(eq(aidRequests.id, aidRequest.id));

        await withSystemRole(tx, (sysTx) =>
          logFlatsAudit(
            {
              actorId: ctx.actorId,
              action: "aid.approved",
              entity: "aid_request",
              entityId: aidRequest.id,
              diff: {
                status: { from: "solicitado", to: "aprovado" },
                dailyAllowanceAmount,
                transportAmount,
              },
            },
            sysTx,
          ),
        );

        const [reservation] = await tx
          .select({ id: reservations.id })
          .from(reservations)
          .where(eq(reservations.id, aidRequest.reservationId))
          .limit(1);

        if (!reservation) throw new Error("Reserva vinculada não encontrada");

        return {
          approved: true as const,
          reservationId: reservation.id,
          aidRequestId: aidRequest.id,
          dailyAllowanceAmount,
          transportAmount,
        };
      },
    );

    if (result.approved) {
      await onFlatsAssistanceApproved({
        reservationId: result.reservationId,
        aidRequestId: result.aidRequestId,
        dailyAllowanceAmount: result.dailyAllowanceAmount,
        transportAmount: result.transportAmount,
      });
    }

    return result;
  });
