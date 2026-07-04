/**
 * confirm-import.test.ts
 *
 * F3-11: confirmImport costumava persistir as `rows` que o cliente reenviava
 * após o preview — adulteráveis entre o preview e a confirmação. Agora o
 * servidor re-parseia `content` do zero; o schema nem aceita mais `rows`.
 * Este teste envia `content` com transações conhecidas e um payload
 * adicional de `rows` forjadas (que o schema simplesmente ignora, por não
 * fazer parte do shape esperado) para provar que o que é persistido vem
 * sempre do re-parse server-side, nunca do que o cliente afirma.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  bankAccounts,
  bankImports,
  bankImportRows,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const ACTOR_ID = "fdda0000-0000-0000-0000-000000000001";
const ACCOUNT_ID = "fdda0000-0000-0000-0000-000000000002";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
    designations: [],
  }),
}));

let bankImportId: string | null = null;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "confirm-import-actor@test.hebron",
      fullName: "Confirm Import Actor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "colaborador", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco Teste Confirm Import",
      createdBy: ACTOR_ID,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  if (bankImportId) {
    await db
      .delete(bankImportRows)
      .where(eq(bankImportRows.bankImportId, bankImportId));
    await db.delete(bankImports).where(eq(bankImports.id, bankImportId));
  }
  await db.delete(bankAccounts).where(eq(bankAccounts.id, ACCOUNT_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  // confirmImport grava audit_log — precisa limpar antes de apagar o user,
  // senão a FK audit_log_actor_id_fkey barra.
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("confirmImport — re-parse server-side (F3-11)", () => {
  it("persiste exatamente o que o re-parse de `content` produz, ignorando qualquer payload de linhas forjado pelo cliente", async () => {
    const content = [
      "data,descricao,valor",
      "01/07/2026,Doação real 1,100",
      "02/07/2026,Doação real 2,200",
      "03/07/2026,Doação real 3,300",
    ].join("\n");

    const { confirmImport } = await import("../actions/import");

    const tamperedPayload = {
      bankAccountId: ACCOUNT_ID,
      format: "csv" as const,
      content,
      fileUrl: `${ACCOUNT_ID}/test-extrato.csv`,
      runAutoMatch: false,
      // Campo estranho ao schema — simula um cliente adulterado tentando
      // reenviar linhas fabricadas. O schema não tem `rows`; isso é ignorado.
      rows: [{ date: "2026-01-01", amount: 999999, description: "FRAUDE" }],
    };

    const result = await confirmImport(
      tamperedPayload as unknown as Parameters<typeof confirmImport>[0],
    );

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.totalRows).toBe(3);

    const bankImport = result?.data?.bankImport;
    expect(bankImport).toBeDefined();
    if (!bankImport) throw new Error("bankImport ausente no resultado");
    bankImportId = bankImport.id;

    const persistedRows = await db
      .select()
      .from(bankImportRows)
      .where(eq(bankImportRows.bankImportId, bankImport.id));

    expect(persistedRows).toHaveLength(3);
    const amounts = persistedRows.map((r) => parseFloat(r.amount)).sort();
    expect(amounts).toEqual([100, 200, 300]);
    expect(persistedRows.some((r) => r.description === "FRAUDE")).toBe(false);
    expect(persistedRows.some((r) => parseFloat(r.amount) === 999999)).toBe(
      false,
    );
  });

  it("fileUrl é o path real do Storage, não mais o nome do arquivo como placeholder", async () => {
    if (!bankImportId) throw new Error("bankImportId não foi definido");
    const bankImport = await db
      .select()
      .from(bankImports)
      .where(eq(bankImports.id, bankImportId));
    expect(bankImport[0]?.fileUrl).toBe(`${ACCOUNT_ID}/test-extrato.csv`);
  });
});
