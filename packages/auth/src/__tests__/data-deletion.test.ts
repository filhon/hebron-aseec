/**
 * data-deletion.test.ts — P-9.2 (LGPD: superfícies de titular).
 *
 * Cobre as primitivas de @hebron/auth que sustentam a tela "Meus Dados":
 *   - getMyDataSnapshot / exportMyData: acesso e portabilidade do próprio
 *     titular (JSON + CSV), com auditoria `data.exported`;
 *   - logPiiAccess: acesso de terceiro (admin) a PID, auditado como
 *     `pii.accessed` (sem valores);
 *   - requestDataDeletion → executeDataDeletion: o direito de exclusão
 *     fim-a-fim. A execução anonimiza a PII DE VERDADE (via anonymizeUser,
 *     P-0.13) e PRESERVA o registro contábil vinculado, agora sob pseudônimo.
 *
 * Usa o `db` superuser para fixtures/asserções (mesmo padrão de
 * anonymization.test.ts) — o foco aqui é a lógica e o efeito da anonimização,
 * não a RLS (testada nas migrations/policies).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  consents,
  auditLog,
  dataDeletionRequests,
  bankAccounts,
  transactions,
} from "@hebron/db/schema";
import {
  getMyDataSnapshot,
  exportMyData,
  logPiiAccess,
} from "@hebron/auth/data-export";
import {
  requestDataDeletion,
  getLatestDeletionRequest,
  executeDataDeletion,
} from "@hebron/auth/data-deletion";

const TARGET_ID = "d9000000-0000-0000-0000-000000000001";
const ADMIN_ID = "d9000000-0000-0000-0000-000000000002";
const ACCOUNT_ID = "d9000000-0000-0000-0000-000000000003";
const TRANSACTION_ID = "d9000000-0000-0000-0000-000000000004";

const ORIGINAL_EMAIL = "titular-p92@test.hebron";
const ORIGINAL_CPF = "52998224725";
const ORIGINAL_PHONE = "11955554444";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: TARGET_ID,
        email: ORIGINAL_EMAIL,
        fullName: "Titular de Teste",
        phone: ORIGINAL_PHONE,
        documentCpf: ORIGINAL_CPF,
        avatarUrl: "https://example.com/avatar-p92.jpg",
      },
      { id: ADMIN_ID, email: "admin-p92@test.hebron", fullName: "Super Admin" },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: TARGET_ID, role: "submissor", grantedBy: ADMIN_ID },
      { userId: ADMIN_ID, role: "super_admin", grantedBy: ADMIN_ID },
    ])
    .onConflictDoNothing();

  // Consentimento existente do titular — deve aparecer no export.
  await db
    .insert(consents)
    .values({
      userId: TARGET_ID,
      purpose: "comunicacao",
      granted: true,
      grantedAt: new Date(),
      source: "cadastro",
    })
    .onConflictDoNothing();

  // Registro contábil vinculado ao titular: conta + lançamento. Deve
  // sobreviver à exclusão, apenas com o dono agora pseudonimizado.
  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco Teste",
      nickname: "Conta Teste P-9.2",
      createdBy: TARGET_ID,
    })
    .onConflictDoNothing();

  await db
    .insert(transactions)
    .values({
      id: TRANSACTION_ID,
      type: "credito",
      amount: "100.00",
      description: "Lançamento de teste P-9.2",
      date: "2026-01-15",
      accountId: ACCOUNT_ID,
      createdBy: TARGET_ID,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  // financeiro.transactions é imutável por trigger (nunca hard delete em
  // produção). Só na limpeza de teste desativamos os triggers na própria
  // transação (SET LOCAL, superuser) para remover o fixture.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL session_replication_role = replica`);
    await tx.delete(transactions).where(eq(transactions.id, TRANSACTION_ID));
    await tx.delete(bankAccounts).where(eq(bankAccounts.id, ACCOUNT_ID));
  });
  await db
    .delete(dataDeletionRequests)
    .where(eq(dataDeletionRequests.userId, TARGET_ID));
  await db.delete(consents).where(eq(consents.userId, TARGET_ID));
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, [TARGET_ID, ADMIN_ID]));
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, [TARGET_ID, ADMIN_ID]));
  await db.delete(users).where(inArray(users.id, [TARGET_ID, ADMIN_ID]));
});

// ---------------------------------------------------------------------------
// Acesso do titular + acesso de terceiro. Rodam ANTES da exclusão (que
// anonimiza a PID usada nas asserções abaixo).
// ---------------------------------------------------------------------------
describe("Meus Dados — acesso e portabilidade", () => {
  it("getMyDataSnapshot retorna perfil + consentimentos do titular", async () => {
    const snapshot = await getMyDataSnapshot(TARGET_ID, db);
    expect(snapshot.profile.email).toBe(ORIGINAL_EMAIL);
    expect(snapshot.profile.documentCpf).toBe(ORIGINAL_CPF);
    expect(snapshot.consents).toHaveLength(1);
    expect(snapshot.consents[0]?.purpose).toBe("comunicacao");
  });

  it("exportMyData serializa JSON e CSV e audita data.exported", async () => {
    const json = await exportMyData(TARGET_ID, "json", db);
    expect(json.filename).toMatch(/\.json$/);
    expect(json.content).toContain(ORIGINAL_EMAIL);
    expect(json.content).toContain("comunicacao");
    // JSON válido e sem PII fora do perfil.
    const parsed = JSON.parse(json.content) as { profile: { email: string } };
    expect(parsed.profile.email).toBe(ORIGINAL_EMAIL);

    const csv = await exportMyData(TARGET_ID, "csv", db);
    expect(csv.filename).toMatch(/\.csv$/);
    expect(csv.content).toContain(ORIGINAL_CPF);

    const entries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "data.exported"),
          eq(auditLog.entityId, TARGET_ID),
        ),
      );
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it("logPiiAccess registra pii.accessed com campos e sujeito, sem valores", async () => {
    await logPiiAccess(
      {
        actorId: ADMIN_ID,
        subjectUserId: TARGET_ID,
        entity: "user",
        fields: ["documentCpf", "phone"],
        context: "teste-acesso-admin",
      },
      db,
    );

    const entries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "pii.accessed"),
          eq(auditLog.entityId, TARGET_ID),
        ),
      );
    const entry = entries.find((e) => e.actorId === ADMIN_ID);
    expect(entry).toBeDefined();
    // Guarda os NOMES dos campos, nunca os valores lidos.
    expect(JSON.stringify(entry?.diff)).toContain("documentCpf");
    expect(JSON.stringify(entry?.diff)).not.toContain(ORIGINAL_CPF);
  });
});

// ---------------------------------------------------------------------------
// Direito de exclusão fim-a-fim.
// ---------------------------------------------------------------------------
describe("Exclusão fim-a-fim (LGPD art. 18, VI)", () => {
  let requestId = "";

  it("requestDataDeletion abre ticket pending e é idempotente", async () => {
    const first = await requestDataDeletion(
      { userId: TARGET_ID, reason: "Não uso mais o sistema" },
      db,
      db,
    );
    expect(first.created).toBe(true);
    expect(first.request.status).toBe("pending");
    requestId = first.request.id;

    // Segunda chamada não duplica nem re-audita.
    const second = await requestDataDeletion({ userId: TARGET_ID }, db, db);
    expect(second.created).toBe(false);
    expect(second.request.id).toBe(requestId);

    const latest = await getLatestDeletionRequest(TARGET_ID, db);
    expect(latest?.id).toBe(requestId);

    const audited = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "data.deletion_requested"),
          eq(auditLog.entityId, requestId),
        ),
      );
    expect(audited).toHaveLength(1);
  });

  it("executeDataDeletion anonimiza a PII e preserva o registro contábil pseudonimizado", async () => {
    const disabled: string[] = [];
    const result = await executeDataDeletion(
      {
        requestId,
        adminId: ADMIN_ID,
        disableLogin: async (userId) => {
          disabled.push(userId);
        },
      },
      db,
    );
    expect(result.anonymization.alreadyAnonymized).toBe(false);

    // PII anonimizada de verdade.
    const [user] = await db.select().from(users).where(eq(users.id, TARGET_ID));
    expect(user?.email).not.toBe(ORIGINAL_EMAIL);
    expect(user?.email).toContain(TARGET_ID);
    expect(user?.fullName).toBe("Usuário anonimizado");
    expect(user?.documentCpf).toBeNull();
    expect(user?.phone).toBeNull();
    expect(user?.anonymizedAt).not.toBeNull();

    // Registro contábil preservado, com o dono agora pseudonimizado.
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, TRANSACTION_ID));
    expect(tx?.createdBy).toBe(TARGET_ID);
    expect(tx?.amount).toBe("100.00");

    // Ticket concluído.
    const [request] = await db
      .select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, requestId));
    expect(request?.status).toBe("completed");
    expect(request?.resolvedBy).toBe(ADMIN_ID);
    expect(request?.resolvedAt).not.toBeNull();

    // Login desativado via callback + auditorias gravadas.
    expect(disabled).toEqual([TARGET_ID]);

    const executed = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "data.deletion_executed"),
          eq(auditLog.entityId, requestId),
        ),
      );
    expect(executed).toHaveLength(1);

    const anonymized = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "user.anonymized"),
          eq(auditLog.entityId, TARGET_ID),
        ),
      );
    expect(anonymized).toHaveLength(1);
  });
});
