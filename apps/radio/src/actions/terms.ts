"use server";

import { eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { termAcceptances } from "@hebron/db/schema";
import { acceptTermSchema } from "@hebron/validators/radio";
import { radioAction } from "../lib/safe-action";
import { logRadioAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// Aceite do termo de não redistribuição/comercialização — único por
// usuário, cobre todos os materiais exclusivos (BRAIN §6.4). Idempotente:
// se o usuário já aceitou, retorna o aceite existente em vez de tentar um
// segundo INSERT (term_acceptances.user_id é unique — RLS também não
// permite UPDATE/DELETE do próprio aceite, packages/db/src/schema/radio.ts).
// Audit gravado na mesma transação via withSystemRole (admin.audit_log só
// tem policy de INSERT para service_role, não para `authenticated` —
// F3-15/S-57, mesmo padrão de logFlatsAudit): se o audit falhar, o aceite
// não é commitado.
// ---------------------------------------------------------------------------

export const acceptTerm = radioAction
  .schema(acceptTermSchema)
  .action(async ({ ctx }) => {
    const acceptance = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [existing] = await tx
          .select()
          .from(termAcceptances)
          .where(eq(termAcceptances.userId, ctx.actorId))
          .limit(1);
        if (existing) return existing;

        const [created] = await tx
          .insert(termAcceptances)
          .values({ userId: ctx.actorId })
          .returning();
        if (!created)
          throw new BusinessError("Falha ao registrar aceite do termo");

        await withSystemRole(tx, (sysTx) =>
          logRadioAudit(
            {
              actorId: ctx.actorId,
              action: "term.accepted",
              entity: "term_acceptance",
              entityId: created.id,
            },
            sysTx,
          ),
        );

        return created;
      },
    );

    return { acceptedAt: acceptance.acceptedAt };
  });
