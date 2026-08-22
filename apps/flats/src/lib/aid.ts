import type { z } from "zod";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import { BusinessError } from "@hebron/auth/safe-action-error";
import { withSystemRole } from "@hebron/db/authenticated";
import { aidRequests } from "@hebron/db/schema";
import type { aidRequestSchema } from "@hebron/validators/flats";
import { logFlatsAudit } from "./audit";

// Módulo SEM "use server" (D1-003, PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md) —
// antes vivia em actions/aid.ts, um arquivo "use server": toda função async
// exportada dali é registrada como Server Action invocável (Next.js App
// Router), o que expunha esta função — que recebe `tx` de uma transação já
// aberta, não um input de cliente — como superfície desnecessária. Agora só
// é alcançável através de reservations.ts::createReservation, que já faz o
// gate.

// ---------------------------------------------------------------------------
// Auxílio opcional (diária fixa + transporte), aprovado caso a caso (BRAIN
// §6.8). createAidRequest é um helper interno chamado por
// reservations.ts::createReservation dentro da mesma transação — não existe
// fluxo de "solicitar auxílio" separado da criação da reserva (o wizard de
// P-7.4 já coleta os dois juntos).
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

  if (!aidRequest)
    throw new BusinessError("Falha ao criar solicitação de auxílio");

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
