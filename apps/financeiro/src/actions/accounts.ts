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
// bank-account-form do Bloco A). Desde P-3.6b, apelido (nickname) e
// instituição (bankName) têm colunas separadas, e o saldo inicial vem do
// formulário em vez de fixado em "0".
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
        nickname: account.nickname,
        agency: account.agency,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        initialBalance: account.initialBalance,
      },
    });

    return { account };
  });
