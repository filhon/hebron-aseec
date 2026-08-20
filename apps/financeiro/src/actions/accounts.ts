"use server";

import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { bankAccounts } from "@hebron/db/schema";
import { createBankAccountSchema } from "@hebron/validators/financeiro";
import { colaboradorAction } from "../lib/safe-action";
import { logFinanceiroAudit } from "../lib/audit";
import { BusinessError } from "@hebron/auth/safe-action-error";

// ---------------------------------------------------------------------------
// createBankAccount — débito de P-3.6/P-3.8 (nenhuma action existia para o
// bank-account-form do Bloco A). Desde P-3.6b, apelido (nickname) e
// instituição (bankName) têm colunas separadas, e o saldo inicial vem do
// formulário em vez de fixado em "0".
// ---------------------------------------------------------------------------

export const createBankAccount = colaboradorAction
  .schema(createBankAccountSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    // "accounts_insert_staff" (0070_financeiro_rls_alinhada.sql) cobre
    // colaborador — o gate de aplicação desta action (colaboradorAction).
    const account = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const inserted = await tx
          .insert(bankAccounts)
          .values({
            bankName: input.bank,
            nickname: input.name,
            agency: input.agency,
            accountNumber: input.accountNumber,
            accountType: input.type,
            initialBalance: input.initialBalance.toFixed(2),
            createdBy: ctx.actorId,
          })
          .returning();

        const account = inserted[0];
        if (!account)
          throw new BusinessError("Falha ao cadastrar conta bancária");
        return account;
      },
    );

    await logFinanceiroAudit({
      actorId: ctx.actorId,
      action: "financeiro.account.created",
      entity: "bank_account",
      entityId: account.id,
      diff: {
        bankName: account.bankName,
        nickname: account.nickname,
        agency: account.agency,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        initialBalance: account.initialBalance,
      },
    });

    return { account };
  });
