"use server";

import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { bankAccounts } from "@hebron/db/schema";
import { createBankAccountSchema } from "@hebron/validators/financeiro";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// createBankAccount — débito de P-3.6/P-3.8 (nenhuma action existia para o
// bank-account-form do Bloco A). financeiro.accounts só tem uma coluna de
// identificação (bank_name) — "name" (apelido) e "bank" (banco) do formulário
// são gravados juntos nela, já que não há coluna separada para apelido.
// ---------------------------------------------------------------------------

export const createBankAccount = colaboradorAction
  .schema(createBankAccountSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // withSystemRole: "accounts_mutate_admin" (0010_financeiro.sql) só
    // concede INSERT/UPDATE/DELETE a super_admin — não cobre colaborador,
    // que é o gate de aplicação desta action (colaboradorAction). Mesmo
    // padrão de exceção documentado para admin.audit_log (F3-15/S-57):
    // débito de RLS registrado em SESSIONS.md, não corrigido aqui (fora de
    // escopo alterar policy).
    const account = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        withSystemRole(tx, async (sysTx) => {
          const inserted = await sysTx
            .insert(bankAccounts)
            .values({
              bankName: input.name,
              agency: input.agency,
              accountNumber: input.accountNumber,
              accountType: input.type,
              initialBalance: "0",
              createdBy: ctx.actorId,
            })
            .returning();

          const account = inserted[0];
          if (!account) throw new Error("Falha ao cadastrar conta bancária");
          return account;
        }),
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.account.created",
      entity: "bank_account",
      entityId: account.id,
      diff: {
        bankName: account.bankName,
        agency: account.agency,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
      },
    });

    return { account };
  });
