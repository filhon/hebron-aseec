/**
 * anonymization.test.ts — P-0.13 (LGPD: fundação).
 *
 * `anonymizeUser` é a primitiva de exclusão (LGPD art. 18, VI): nunca
 * remove linha, só substitui PII por pseudônimo. Testa que:
 *   - public.users e projetos.organizations (created_by) são pseudonimizados;
 *   - FKs (role_assignments) permanecem intactas;
 *   - diffs "legados" (gravados antes desta fundação) em admin.audit_log
 *     são redigidos;
 *   - a operação é idempotente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  auditLog,
} from "@hebron/db/schema";
import { anonymizeUser } from "@hebron/db/anonymization";

const TARGET_ID = "d3000000-0000-0000-0000-000000000001";
const ACTOR_ID = "d3000000-0000-0000-0000-000000000002";
const ORG_ID = "d3000000-0000-0000-0000-000000000003";
const TARGET_FAIL_ID = "d3000000-0000-0000-0000-000000000004";

const ORIGINAL_EMAIL = "anon-target@test.hebron";
const ORIGINAL_PHONE = "11988887777";
const ORIGINAL_CPF = "11122233396";
const ORIGINAL_FAIL_EMAIL = "anon-fail-target@test.hebron";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: TARGET_ID,
        email: ORIGINAL_EMAIL,
        fullName: "Fulano de Tal",
        phone: ORIGINAL_PHONE,
        documentCpf: ORIGINAL_CPF,
        avatarUrl: "https://example.com/avatar.jpg",
      },
      { id: ACTOR_ID, email: "anon-actor@test.hebron", fullName: "Ator" },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({ userId: TARGET_ID, role: "submissor", grantedBy: ACTOR_ID })
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({
      id: ORG_ID,
      nome: "Instituição Teste",
      cnpj: "11.222.333/0001-44",
      endereco: "Rua Teste, 123",
      telefone: "1133334444",
      responsavelLegal: "Fulano de Tal",
      createdBy: TARGET_ID,
    })
    .onConflictDoNothing();

  // Entrada "legada": diff com PII bruta, como logAudit gravava antes de
  // P-0.13 redigir automaticamente — anonymizeUser deve limpá-la mesmo assim.
  await db.insert(auditLog).values({
    actorId: ACTOR_ID,
    action: "user.updated",
    entity: "user",
    entityId: TARGET_ID,
    diff: {
      email: { before: "velho@x.com", after: ORIGINAL_EMAIL },
      status: { before: "pending_approval", after: "active" },
    },
  });

  await db.insert(auditLog).values({
    actorId: ACTOR_ID,
    action: "organization.updated",
    entity: "organization",
    entityId: ORG_ID,
    diff: {
      responsavelLegal: { before: null, after: "Fulano de Tal" },
    },
  });

  // Fixture dedicada de D1-005: usuário + entrada legada de PII isolados do
  // TARGET_ID acima, para não interferir com os testes de sucesso/
  // idempotência (o teste de falha nunca deve deixar a linha redigida).
  await db
    .insert(users)
    .values({
      id: TARGET_FAIL_ID,
      email: ORIGINAL_FAIL_EMAIL,
      fullName: "Alvo Falha",
    })
    .onConflictDoNothing();
  await db.insert(auditLog).values({
    actorId: ACTOR_ID,
    action: "user.updated",
    entity: "user",
    entityId: TARGET_FAIL_ID,
    diff: {
      email: { before: "velho-fail@x.com", after: ORIGINAL_FAIL_EMAIL },
    },
  });
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(organizations).where(eq(organizations.id, ORG_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, TARGET_ID));
  await db.delete(users).where(eq(users.id, TARGET_ID));
  await db.delete(users).where(eq(users.id, TARGET_FAIL_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("anonymizeUser", () => {
  it("substitui PII em public.users e marca anonymizedAt", async () => {
    const result = await anonymizeUser(TARGET_ID, ACTOR_ID);

    expect(result.alreadyAnonymized).toBe(false);

    const [row] = await db.select().from(users).where(eq(users.id, TARGET_ID));
    expect(row?.email).not.toBe(ORIGINAL_EMAIL);
    expect(row?.email).toContain(TARGET_ID);
    expect(row?.fullName).toBe("Usuário anonimizado");
    expect(row?.phone).toBeNull();
    expect(row?.documentCpf).toBeNull();
    expect(row?.avatarUrl).toBeNull();
    expect(row?.anonymizedAt).not.toBeNull();
  });

  it("mantém a linha e as FKs (role_assignments continua íntegro)", async () => {
    const rows = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, TARGET_ID));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe("submissor");
  });

  it("pseudonimiza responsavelLegal da organização criada pelo usuário, mantém o resto", async () => {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ORG_ID));

    expect(org?.responsavelLegal).toBe("Representante anonimizado");
    // Dados institucionais da pessoa jurídica não são tocados.
    expect(org?.nome).toBe("Instituição Teste");
    expect(org?.cnpj).toBe("11.222.333/0001-44");
    expect(org?.endereco).toBe("Rua Teste, 123");
  });

  it("redige diffs legados de admin.audit_log ligados ao usuário e à organização", async () => {
    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, TARGET_ID));
    const userUpdateEntry = entries.find((e) => e.action === "user.updated");
    expect(userUpdateEntry?.diff).toMatchObject({
      email: { redacted: true },
    });
    // Campo não sensível do mesmo diff permanece intacto.
    expect(userUpdateEntry?.diff).toMatchObject({
      status: { before: "pending_approval", after: "active" },
    });

    const orgEntries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, ORG_ID));
    const orgUpdateEntry = orgEntries.find(
      (e) => e.action === "organization.updated",
    );
    expect(orgUpdateEntry?.diff).toEqual({
      responsavelLegal: { redacted: true },
    });
  });

  it("grava uma entrada user.anonymized sem PII", async () => {
    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "user.anonymized"));
    const entry = entries.find((e) => e.entityId === TARGET_ID);
    expect(entry).toBeDefined();
    expect(JSON.stringify(entry?.diff)).not.toContain(ORIGINAL_EMAIL);
  });

  it("é idempotente — segunda chamada é no-op", async () => {
    const result = await anonymizeUser(TARGET_ID, ACTOR_ID);
    expect(result.alreadyAnonymized).toBe(true);
    expect(result.redactedAuditEntries).toBe(0);
    expect(result.redactedOrganizations).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// D1-005: com o dbHandle privilegiado padrão, o UPDATE em admin.audit_log
// sempre afeta 1 linha (superuser ignora RLS/grants) — não dá para forçar o
// caminho de 0-linhas contra o banco real sem um segundo papel de conexão.
// Em vez disso, um dbHandle de teste delega select/insert ao `db` real e
// intercepta só `.update(auditLog)`, fazendo `.returning()` resolver vazio —
// exatamente o efeito de rodar sob um handle sem policy de UPDATE nessa
// tabela (o cenário que o guard de anonymization.ts existe para pegar).
// ---------------------------------------------------------------------------

function withAuditLogUpdateBlackHole(realDb: typeof db): typeof db {
  return {
    select: realDb.select.bind(realDb),
    insert: realDb.insert.bind(realDb),
    update: (table: Parameters<typeof realDb.update>[0]) => {
      if (table === auditLog) {
        return {
          set: () => ({
            where: () => ({
              returning: async () => [] as { id: string }[],
            }),
          }),
        };
      }
      return realDb.update(table);
    },
  } as unknown as typeof db;
}

describe("anonymizeUser — falha se o UPDATE em admin.audit_log afeta 0 linhas (D1-005)", () => {
  it("lança em vez de reportar sucesso, e a entrada legada permanece com a PII em claro", async () => {
    const blackHoleDb = withAuditLogUpdateBlackHole(db);

    await expect(
      anonymizeUser(TARGET_FAIL_ID, ACTOR_ID, blackHoleDb),
    ).rejects.toThrow(/UPDATE afetou 0 linhas/);

    // A redação não "aconteceu silenciosamente" — a entrada legada segue
    // com o e-mail em claro, prova de que o guard barrou antes do sucesso
    // falso que o achado D1-005 descreve.
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, TARGET_FAIL_ID));
    expect(JSON.stringify(entry?.diff)).toContain(ORIGINAL_FAIL_EMAIL);

    // public.users já tinha sido anonimizado antes do UPDATE em audit_log
    // (a função não é transacional entre as duas escritas) — o guard pega
    // exatamente o passo que o achado descreve, não o resto da função.
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, TARGET_FAIL_ID));
    expect(row?.email).not.toBe(ORIGINAL_FAIL_EMAIL);
  });
});
