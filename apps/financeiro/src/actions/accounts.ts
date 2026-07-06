"use server";

import { db } from "@hebron/db/client";
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
    const inserted = await db
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
