/**
 * audit-pii-redaction.test.ts — P-0.13 (LGPD: fundação).
 *
 * `computeDiff`/`logAudit` nunca devem persistir o valor de um campo de PII
 * em `admin.audit_log.diff` (S1-03/F3-09: audit imutável, particionado até
 * 2027, guardava e-mail/nome/telefone/CPF em texto puro). Testa a função
 * pura `redactSensitiveFields` e a persistência real via `logAudit`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { createRequire } from "module";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, auditLog } from "@hebron/db/schema";
import * as schema from "../schema/index";
import {
  computeDiff,
  logAudit,
  redactSensitiveFields,
  SENSITIVE_AUDIT_FIELDS,
} from "@hebron/db/audit";

// Mesma técnica de schema-parity.test.ts: generateDrizzleJson introspecciona
// o schema Drizzle em memória (sem tocar o banco), então dá para comparar a
// lista de redação contra colunas reais sem depender de DATABASE_URL.
const { generateDrizzleJson } = createRequire(import.meta.url)(
  "drizzle-kit/api",
) as {
  generateDrizzleJson: (imports: Record<string, unknown>) => {
    tables: Record<
      string,
      {
        schema: string;
        name: string;
        columns: Record<string, { name: string }>;
      }
    >;
  };
};

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

describe("SENSITIVE_AUDIT_FIELDS — cobre a PII conhecida do schema (D8-003)", () => {
  // Registro curado de colunas de PII por tabela (BRAIN §9: "todo prompt que
  // adicionar um campo de PII a qualquer schema deve incluir o nome do campo
  // nessa lista" — espelha docs/lgpd-inventario-dados-pessoais.md). Falha em
  // dois sentidos: se a coluna sumir do schema (nome mudou) ou se
  // SENSITIVE_AUDIT_FIELDS não cobrir mais a chave.
  const KNOWN_PII_COLUMNS: { table: string; columns: string[] }[] = [
    {
      table: "public.users",
      columns: ["fullName", "email", "phone", "documentCpf"],
    },
    {
      table: "projetos.organizations",
      columns: ["responsavelLegal", "telefone", "endereco"],
    },
    {
      table: "flats.guests",
      columns: ["name", "cpf", "birthDate", "email", "phone"],
    },
    { table: "flats.vehicles", columns: ["plate"] },
  ];

  const canonical = generateDrizzleJson({ ...schema });
  const tableByKey = new Map(
    Object.values(canonical.tables).map((t) => [
      `${t.schema || "public"}.${t.name}`,
      t,
    ]),
  );

  // `table.columns` do drizzle-kit/api é chaveado pelo nome de coluna do
  // banco (snake_case); SENSITIVE_AUDIT_FIELDS opera sobre a chave camelCase
  // dos objetos TS (é o que `diff`/`redactSensitiveFields` de fato veem).
  function toSnakeCase(camel: string): string {
    return camel.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  it.each(
    KNOWN_PII_COLUMNS.flatMap((entry) =>
      entry.columns.map((c) => [entry.table, c]),
    ),
  )(
    "%s.%s existe no schema e está redigida em SENSITIVE_AUDIT_FIELDS",
    (table, column) => {
      const tableDef = tableByKey.get(table);
      expect(
        tableDef,
        `tabela ${table} não encontrada no schema`,
      ).toBeDefined();
      expect(
        tableDef?.columns[toSnakeCase(column)],
        `coluna ${column} não encontrada em ${table} — atualize KNOWN_PII_COLUMNS`,
      ).toBeDefined();
      expect(
        SENSITIVE_AUDIT_FIELDS.has(column),
        `${table}.${column} é PII conhecida e não está em SENSITIVE_AUDIT_FIELDS`,
      ).toBe(true);
    },
  );
});
