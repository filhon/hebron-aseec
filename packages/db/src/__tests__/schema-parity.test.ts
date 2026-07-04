/**
 * schema-parity.test.ts — Paridade schema TS ↔ banco migrado (P-0.11).
 *
 * As migrations continuam sendo SQL hand-authored (ver README) — drizzle-kit
 * não gera RLS, partições ou funções SECURITY DEFINER corretamente. Este
 * teste prova que, apesar disso, elas produzem exatamente o que
 * schema/index.ts declara: toda tabela/coluna/enum do Drizzle schema existe
 * de fato no banco depois de `db:migrate`, nos dois sentidos. Sem isso, um
 * TS ↔ SQL dessincronizado (a classe de acidente que produziu o F3-02) passa
 * despercebido até o runtime.
 *
 * Requer: DATABASE_URL apontando para um banco já migrado (no CI, o Postgres
 * efêmero do Supabase local subido em P-0.9, logo após `db:migrate`).
 */
import { describe, it, expect, afterAll } from "vitest";
import { createRequire } from "module";
import postgres from "postgres";
import * as schema from "../schema/index";

// drizzle-kit/api's ESM build (.mjs) crashes with a dynamic-require-of-"fs"
// error at import time (a bug in that bundle) — its CJS build (.js) works.
// createRequire lets us load the CJS build from this ESM test file.
const { generateDrizzleJson } = createRequire(import.meta.url)(
  "drizzle-kit/api",
) as {
  generateDrizzleJson: (imports: Record<string, unknown>) => CanonicalSchema;
};

type CanonicalSchema = {
  tables: Record<
    string,
    { schema: string; name: string; columns: Record<string, { name: string }> }
  >;
  enums: Record<string, { schema: string; name: string; values: string[] }>;
};

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL)
  throw new Error("DATABASE_URL is required for the schema parity test");
const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

afterAll(async () => {
  await sql.end();
});

const canonical = generateDrizzleJson({ ...schema });
const tableList = Object.values(canonical.tables);
const enumList = Object.values(canonical.enums);
const schemas = [...new Set(tableList.map((t) => t.schema || "public"))];

describe("schema parity: TS ↔ database", () => {
  it("every table/column declared in schema/index.ts matches the database, in both directions", async () => {
    const dbColumns = await sql<
      { table_schema: string; table_name: string; column_name: string }[]
    >`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema IN ${sql(schemas)}
    `;

    const dbColumnsByTable = new Map<string, Set<string>>();
    for (const row of dbColumns) {
      const key = `${row.table_schema}.${row.table_name}`;
      const existing = dbColumnsByTable.get(key);
      if (existing) {
        existing.add(row.column_name);
      } else {
        dbColumnsByTable.set(key, new Set([row.column_name]));
      }
    }

    const mismatches: string[] = [];

    for (const table of tableList) {
      const key = `${table.schema || "public"}.${table.name}`;
      const dbCols = dbColumnsByTable.get(key);
      if (!dbCols) {
        mismatches.push(
          `${key}: declared in schema/index.ts but missing from the database`,
        );
        continue;
      }
      const tsCols = new Set(Object.values(table.columns).map((c) => c.name));
      for (const c of tsCols) {
        if (!dbCols.has(c))
          mismatches.push(
            `${key}.${c}: declared in TS but missing in the database`,
          );
      }
      for (const c of dbCols) {
        if (!tsCols.has(c))
          mismatches.push(
            `${key}.${c}: exists in the database but missing in TS`,
          );
      }
    }

    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });

  it("every enum declared in schema/index.ts has the same values in the database", async () => {
    const dbEnumRows = await sql<
      { schema: string; name: string; value: string }[]
    >`
      SELECT n.nspname AS schema, t.typname AS name, e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname IN ${sql(schemas)}
      ORDER BY n.nspname, t.typname, e.enumsortorder
    `;

    const dbEnumValues = new Map<string, string[]>();
    for (const row of dbEnumRows) {
      const key = `${row.schema}.${row.name}`;
      const existing = dbEnumValues.get(key);
      if (existing) {
        existing.push(row.value);
      } else {
        dbEnumValues.set(key, [row.value]);
      }
    }

    const mismatches: string[] = [];

    for (const e of enumList) {
      const key = `${e.schema}.${e.name}`;
      const dbValues = dbEnumValues.get(key);
      if (!dbValues) {
        mismatches.push(
          `${key}: declared in TS but missing entirely in the database`,
        );
        continue;
      }
      const tsSorted = [...e.values].sort();
      const dbSorted = [...dbValues].sort();
      if (JSON.stringify(tsSorted) !== JSON.stringify(dbSorted)) {
        mismatches.push(
          `${key}: TS=${JSON.stringify(tsSorted)} DB=${JSON.stringify(dbSorted)}`,
        );
      }
    }

    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });
});
