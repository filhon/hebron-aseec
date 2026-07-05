/**
 * audit-pii-redaction.test.ts — P-0.13 (LGPD: fundação).
 *
 * `computeDiff`/`logAudit` nunca devem persistir o valor de um campo de PII
 * em `admin.audit_log.diff` (S1-03/F3-09: audit imutável, particionado até
 * 2027, guardava e-mail/nome/telefone/CPF em texto puro). Testa a função
 * pura `redactSensitiveFields` e a persistência real via `logAudit`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, auditLog } from "@hebron/db/schema";
import {
  computeDiff,
  logAudit,
  redactSensitiveFields,
  SENSITIVE_AUDIT_FIELDS,
} from "@hebron/db/audit";

const ACTOR_ID = "d1000000-0000-0000-0000-000000000001";

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("redactSensitiveFields", () => {
  it("substitui o valor de campos sensíveis no nível raiz", () => {
    const diff = { email: { before: "old@x.com", after: "new@x.com" } };
    expect(redactSensitiveFields(diff)).toEqual({
      email: { redacted: true },
    });
  });

  it("mantém campos não sensíveis intactos", () => {
    const diff = {
      status: { before: "active", after: "suspended" },
      email: { before: "old@x.com", after: "new@x.com" },
    };
    expect(redactSensitiveFields(diff)).toEqual({
      status: { before: "active", after: "suspended" },
      email: { redacted: true },
    });
  });

  it("redige recursivamente campos aninhados (ex.: diff { after: {...} })", () => {
    const diff = { after: { email: "a@b.com", fullName: "Fulano" } };
    expect(redactSensitiveFields(diff)).toEqual({
      after: { email: { redacted: true }, fullName: { redacted: true } },
    });
  });

  it("cobre todos os campos declarados sensíveis", () => {
    expect([...SENSITIVE_AUDIT_FIELDS]).toEqual(
      expect.arrayContaining([
        "email",
        "fullName",
        "phone",
        "documentCpf",
        "responsavelLegal",
        "telefone",
        "endereco",
      ]),
    );
  });
});

describe("computeDiff — redação automática", () => {
  it("redige e-mail e nome quando mudam, mantém outros campos", () => {
    const before = {
      fullName: "Ana Antiga",
      email: "a@x.com",
      status: "active",
    };
    const after = { fullName: "Ana Nova", email: "a2@x.com", status: "active" };

    expect(computeDiff(before, after)).toEqual({
      fullName: { redacted: true },
      email: { redacted: true },
    });
  });

  it("não inclui campo sensível no diff quando ele não muda", () => {
    const before = { fullName: "Ana", phone: "11999999999" };
    const after = { fullName: "Ana", phone: "11999999999" };
    expect(computeDiff(before, after)).toEqual({});
  });
});

describe("logAudit — nunca persiste PII, mesmo em diff montado à mão", () => {
  it("redige e-mail passado diretamente (sem passar por computeDiff)", async () => {
    await db.insert(users).values({
      id: ACTOR_ID,
      email: "audit-pii-actor@test.hebron",
      fullName: "Audit PII Actor",
    });

    await logAudit({
      actorId: ACTOR_ID,
      action: "user.created",
      entity: "user",
      entityId: ACTOR_ID,
      diff: { after: { email: "vazamento@x.com", fullName: "Nome Vazado" } },
    });

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, ACTOR_ID));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.diff).toEqual({
      after: { email: { redacted: true }, fullName: { redacted: true } },
    });
  });
});
