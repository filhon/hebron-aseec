/**
 * conciliation.test.ts — import OFX e match automático (P-3.12).
 *
 * Import OFX: parseFileContent (../lib/import-parsers) extrai data/valor/
 * descrição de blocos <STMTTRN> — parseCSV já tem cobertura própria em
 * csv-parser.test.ts (F3-19); aqui cobrimos o ramo OFX, ainda sem teste.
 *
 * Match automático: autoMatchImport (actions/conciliation.ts) casa linhas
 * de import não conciliadas com transactions existentes por valor + data
 * (±3 dias) + sobreposição de descrição — aplica matches de alta confiança
 * imediatamente (status "matched" + match_transaction_id).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  bankAccounts,
  transactions,
  bankImports,
  bankImportRows,
  auditLog,
  payables,
} from "@hebron/db/schema";
import { parseFileContent } from "../lib/import-parsers";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const ACTOR_ID = "bb110000-0000-0000-0000-000000000001";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
    designations: [],
  }),
}));

describe("parseFileContent — OFX (Import OFX: parse correto dos campos)", () => {
  it("extrai data, valor e descrição de cada bloco <STMTTRN>", () => {
    const content = [
      "OFXHEADER:100",
      "<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>",
      "<STMTTRN>",
      "<TRNTYPE>DEBIT",
      "<DTPOSTED>20260615120000",
      "<TRNAMT>-150.00",
      "<FITID>0001",
      "<MEMO>PAGTO FORNECEDOR XYZ",
      "</STMTTRN>",
      "<STMTTRN>",
      "<TRNTYPE>CREDIT",
      "<DTPOSTED>20260616",
      "<TRNAMT>300,50",
      "<FITID>0002",
      "<NAME>DOACAO RECEBIDA",
      "</STMTTRN>",
      "</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>",
    ].join("\r\n");

    const rows = parseFileContent(content, "ofx");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: "2026-06-15",
      amount: -150,
      description: "PAGTO FORNECEDOR XYZ",
    });
    expect(rows[1]?.date).toBe("2026-06-16");
    expect(rows[1]?.amount).toBe(300.5);
    expect(rows[1]?.description).toBe("DOACAO RECEBIDA");
  });

  it("ignora blocos sem DTPOSTED ou TRNAMT", () => {
    const content = [
      "<STMTTRN><TRNTYPE>DEBIT<MEMO>Sem data nem valor</STMTTRN>",
    ].join("\r\n");
    expect(parseFileContent(content, "ofx")).toHaveLength(0);
  });
});

describe("autoMatchImport — Match automático (valor + data)", () => {
  const ACCOUNT_ID = "bb110000-0000-0000-0000-000000000010";
  const MATCHING_TX_ID = "bb110000-0000-0000-0000-000000000011";
  const BANK_IMPORT_ID = "bb110000-0000-0000-0000-000000000020";
  const MATCHING_ROW_ID = "bb110000-0000-0000-0000-000000000021";
  const UNMATCHED_ROW_ID = "bb110000-0000-0000-0000-000000000022";

  beforeAll(async () => {
    await db
      .insert(users)
      .values({
        id: ACTOR_ID,
        email: "conciliation-actor@test.hebron",
        fullName: "Conciliation Actor",
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
        bankName: "Banco Conciliation Teste",
        nickname: "Conta Conciliation Teste",
        createdBy: ACTOR_ID,
      })
      .onConflictDoNothing();

    // Transação já existente no ledger — o candidato a match. Imutável
    // (trigger financeiro.forbid_transaction_mutation) — nunca é apagada no
    // afterAll, então o insert é idempotente (onConflictDoNothing) para
    // reexecuções reaproveitarem a mesma linha em vez de colidir na PK.
    await db
      .insert(transactions)
      .values({
        id: MATCHING_TX_ID,
        type: "debito",
        amount: "250.00",
        description: "PGTO FORNECEDOR TESTE",
        date: "2026-06-10",
        accountId: ACCOUNT_ID,
        createdBy: ACTOR_ID,
      })
      .onConflictDoNothing();

    await db.insert(bankImports).values({
      id: BANK_IMPORT_ID,
      accountId: ACCOUNT_ID,
      fileUrl: `${ACCOUNT_ID}/extrato-teste.ofx`,
      format: "ofx",
      importedBy: ACTOR_ID,
      rowCount: 2,
      matchedCount: 0,
    });

    await db.insert(bankImportRows).values([
      {
        id: MATCHING_ROW_ID,
        bankImportId: BANK_IMPORT_ID,
        date: "2026-06-11", // 1 dia de diferença — dentro da tolerância de ±3 dias
        amount: "-250.00",
        description: "PGTO FORNECEDOR TESTE CONCILIACAO",
        status: "unmatched",
      },
      {
        id: UNMATCHED_ROW_ID,
        bankImportId: BANK_IMPORT_ID,
        date: "2026-06-20",
        amount: "-999.00", // valor sem correspondência
        description: "SEM CORRESPONDENCIA",
        status: "unmatched",
      },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(bankImportRows)
      .where(eq(bankImportRows.bankImportId, BANK_IMPORT_ID));
    await db.delete(bankImports).where(eq(bankImports.id, BANK_IMPORT_ID));
    await db.delete(auditLog).where(eq(auditLog.entityId, BANK_IMPORT_ID));
    // MATCHING_TX_ID nunca é apagada (trigger de imutabilidade) — por isso
    // ACCOUNT_ID (account_id) e ACTOR_ID (created_by) também permanecem,
    // reaproveitados na próxima execução via onConflictDoNothing acima.
  });

  it("encontra correspondência por valor + data e marca a linha como matched", async () => {
    const { autoMatchImport } = await import("../actions/conciliation");
    const result = await autoMatchImport({ bankImportId: BANK_IMPORT_ID });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.matched).toBe(1);

    const [matchedRow] = await db
      .select()
      .from(bankImportRows)
      .where(eq(bankImportRows.id, MATCHING_ROW_ID));
    expect(matchedRow?.status).toBe("matched");
    expect(matchedRow?.matchTransactionId).toBe(MATCHING_TX_ID);

    const [unmatchedRow] = await db
      .select()
      .from(bankImportRows)
      .where(eq(bankImportRows.id, UNMATCHED_ROW_ID));
    expect(unmatchedRow?.status).toBe("unmatched");

    const [bankImport] = await db
      .select()
      .from(bankImports)
      .where(eq(bankImports.id, BANK_IMPORT_ID));
    expect(bankImport?.matchedCount).toBe(1);

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, BANK_IMPORT_ID));
    expect(
      audits.some((a) => a.action === "financeiro.import.row.reconciled"),
    ).toBe(true);
  });
});

describe("autoMatchImport — sugestão de payable usa valor + data + descrição, não só valor (D6-003)", () => {
  const ACCOUNT_ID = "bb110000-0000-0000-0000-000000000030";
  const BANK_IMPORT_ID = "bb110000-0000-0000-0000-000000000031";
  const ROW_ID = "bb110000-0000-0000-0000-000000000032";
  // Mesmo valor nos dois payables — antes da correção, `.find()` pegava
  // sempre o primeiro pendente do mesmo valor, ignorando data e descrição.
  const FAR_PAYABLE_ID = "bb110000-0000-0000-0000-000000000033"; // inserido primeiro, fora da janela de ±5 dias
  const CLOSE_PAYABLE_ID = "bb110000-0000-0000-0000-000000000034"; // dentro da janela e com descrição parecida

  beforeAll(async () => {
    await db
      .insert(users)
      .values({
        id: ACTOR_ID,
        email: "conciliation-actor@test.hebron",
        fullName: "Conciliation Actor",
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
        bankName: "Banco Conciliation D6-003",
        nickname: "Conta Conciliation D6-003",
        createdBy: ACTOR_ID,
      })
      .onConflictDoNothing();

    // Inserida primeiro de propósito: sob o bug antigo (só valor), o
    // `.find()` teria escolhido esta — mesmo estando 20 dias longe da linha
    // do extrato e com descrição sem relação nenhuma.
    await db.insert(payables).values([
      {
        id: FAR_PAYABLE_ID,
        description: "Aluguel do salão de eventos",
        amount: "500.00",
        dueDate: "2026-01-01",
        accountId: ACCOUNT_ID,
        status: "autorizado",
        createdBy: ACTOR_ID,
      },
      {
        id: CLOSE_PAYABLE_ID,
        description: "Conta de luz abril",
        amount: "500.00",
        dueDate: "2026-06-12",
        accountId: ACCOUNT_ID,
        status: "autorizado",
        createdBy: ACTOR_ID,
      },
    ]);

    await db.insert(bankImports).values({
      id: BANK_IMPORT_ID,
      accountId: ACCOUNT_ID,
      fileUrl: `${ACCOUNT_ID}/extrato-teste.ofx`,
      format: "ofx",
      importedBy: ACTOR_ID,
      rowCount: 1,
      matchedCount: 0,
    });

    await db.insert(bankImportRows).values({
      id: ROW_ID,
      bankImportId: BANK_IMPORT_ID,
      date: "2026-06-10", // 2 dias de CLOSE_PAYABLE_ID; 161 dias de FAR_PAYABLE_ID
      amount: "-500.00",
      description: "PAGAMENTO CONTA DE LUZ ABRIL COPEL",
      status: "unmatched",
    });
  });

  afterAll(async () => {
    await db
      .delete(bankImportRows)
      .where(eq(bankImportRows.bankImportId, BANK_IMPORT_ID));
    await db.delete(bankImports).where(eq(bankImports.id, BANK_IMPORT_ID));
    await db.delete(auditLog).where(eq(auditLog.entityId, BANK_IMPORT_ID));
    await db.delete(payables).where(eq(payables.id, FAR_PAYABLE_ID));
    await db.delete(payables).where(eq(payables.id, CLOSE_PAYABLE_ID));
  });

  it("sugere o payable dentro da janela de data e com descrição parecida, não o primeiro do mesmo valor", async () => {
    const { autoMatchImport } = await import("../actions/conciliation");
    const result = await autoMatchImport({ bankImportId: BANK_IMPORT_ID });

    expect(result?.serverError).toBeUndefined();
    const suggestion = result?.data?.suggestions.find(
      (s) => s.rowId === ROW_ID,
    );
    expect(suggestion?.suggestedPayableId).toBe(CLOSE_PAYABLE_ID);
  });
});
