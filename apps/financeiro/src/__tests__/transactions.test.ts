/**
 * transactions.test.ts — imutabilidade do ledger e estorno (P-3.12).
 *
 * Imutabilidade: financeiro.transactions nunca recebe GRANT de UPDATE/DELETE
 * para `authenticated` (0014_grants_authenticated.sql) — mas o trigger
 * financeiro.forbid_transaction_mutation (0010_financeiro.sql) é a segunda
 * camada de defesa, independente do GRANT. Os testes abaixo usam a conexão
 * `db` (DATABASE_URL, dona das tabelas — bypassa RLS e GRANT) para provar
 * que o próprio trigger recusa a mutação, não apenas o GRANT.
 *
 * Estorno: createReversal (super_admin) cria uma transação de contrapartida
 * + um registro em transaction_reversals, sem jamais alterar a transação
 * original (ver describe de imutabilidade acima).
 *
 * Cleanup: como o próprio trigger bloqueia DELETE, a transação seedada aqui
 * (e o estorno criado por createReversal) NUNCA são apagados — mesmo em
 * teardown de teste. Por isso a conta bancária e o super_admin
 * (referenciados via account_id/created_by, FK RESTRICT) também
 * permanecem: são infraestrutura de teste reaproveitada entre execuções
 * (onConflictDoNothing no beforeAll), não lixo que cresce a cada rodada. O
 * TX_ID é gerado pelo banco (não fixo) para que cada execução comece com
 * uma transação sem estorno prévio — necessário para o teste "cria
 * reversal com sucesso" continuar válido em reexecuções.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  bankAccounts,
  transactions,
  transactionReversals,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const IDS = {
  superAdmin: "aa110000-0000-0000-0000-000000000001",
  colaborador: "aa110000-0000-0000-0000-000000000002",
} as const;

let currentSession: {
  actorId: string;
  roles: string[];
  designations: string[];
} = {
  actorId: IDS.superAdmin,
  roles: ["super_admin"],
  designations: [],
};

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(async () => currentSession),
}));

const ACCOUNT_ID = "aa110000-0000-0000-0000-000000000010";
let TX_ID = "";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.superAdmin,
        email: "tx-super@test.hebron",
        fullName: "Tx SuperAdmin",
      },
      {
        id: IDS.colaborador,
        email: "tx-colab@test.hebron",
        fullName: "Tx Colaborador",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.colaborador,
        role: "colaborador",
        grantedBy: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco Transactions Teste",
      nickname: "Conta Transactions Teste",
      createdBy: IDS.superAdmin,
    })
    .onConflictDoNothing();

  const inserted = await db
    .insert(transactions)
    .values({
      type: "credito",
      amount: "500.00",
      description: "Doação recebida — teste imutabilidade",
      date: "2026-06-01",
      accountId: ACCOUNT_ID,
      createdBy: IDS.superAdmin,
    })
    .returning({ id: transactions.id });

  const tx = inserted[0];
  if (!tx) throw new Error("Falha ao seedar transação de teste");
  TX_ID = tx.id;
});

afterAll(async () => {
  // Nada de financeiro.transactions/transaction_reversals é apagado aqui —
  // ver comentário no topo do arquivo. Só o colaborador (nunca referenciado
  // por uma transação real) é removido.
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.colaborador));
  await db.delete(users).where(eq(users.id, IDS.colaborador));
});

describe("financeiro.transactions — imutabilidade (trigger DB)", () => {
  it("UPDATE é rejeitado pelo trigger, mesmo em conexão que bypassa RLS/GRANT", async () => {
    await expect(
      db
        .update(transactions)
        .set({ description: "alterada" })
        .where(eq(transactions.id, TX_ID)),
    ).rejects.toThrow(/imutáve/i);
  });

  it("DELETE é rejeitado pelo trigger", async () => {
    await expect(
      db.delete(transactions).where(eq(transactions.id, TX_ID)),
    ).rejects.toThrow(/imutáve/i);
  });
});

describe("createReversal — estorno cria transação de contrapartida (super_admin)", () => {
  it("colaborador não pode criar estorno (apenas super_admin)", async () => {
    currentSession = {
      actorId: IDS.colaborador,
      roles: ["colaborador"],
      designations: [],
    };
    const { createReversal } = await import("../actions/transactions");
    const result = await createReversal({
      originalTransactionId: TX_ID,
      reason: "Motivo de teste com mais de dez caracteres",
    });
    expect(result?.serverError).toBeDefined();
  });

  it("super_admin cria reversal: contrapartida + registro + audit, original intacta", async () => {
    currentSession = {
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
      designations: [],
    };
    const { createReversal } = await import("../actions/transactions");
    const result = await createReversal({
      originalTransactionId: TX_ID,
      reason: "Lançamento duplicado por engano do operador",
    });
    expect(result?.serverError).toBeUndefined();

    const reversalTx = result?.data?.reversalTransaction;
    expect(reversalTx).toBeDefined();
    expect(reversalTx?.type).toBe("debito"); // original era crédito
    expect(reversalTx?.amount).toBe("500.00");
    expect(reversalTx?.referenceType).toBe("reversal");
    expect(reversalTx?.referenceId).toBe(TX_ID);

    const [original] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, TX_ID));
    expect(original?.description).toBe("Doação recebida — teste imutabilidade");

    const reversalRecords = await db
      .select()
      .from(transactionReversals)
      .where(eq(transactionReversals.originalTransactionId, TX_ID));
    expect(reversalRecords).toHaveLength(1);
    expect(reversalRecords[0]?.justification).toContain("duplicado");

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, TX_ID));
    expect(
      audits.some((a) => a.action === "financeiro.transaction.reversed"),
    ).toBe(true);
  });

  it("não permite estornar uma transação que já possui estorno", async () => {
    currentSession = {
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
      designations: [],
    };
    const { createReversal } = await import("../actions/transactions");
    const result = await createReversal({
      originalTransactionId: TX_ID,
      reason: "Segunda tentativa de estorno da mesma transação",
    });
    expect(result?.serverError).toBeDefined();
  });
});
