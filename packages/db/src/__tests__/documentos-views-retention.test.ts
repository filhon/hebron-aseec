/**
 * documentos-views-retention.test.ts — P-0.13 (LGPD: fundação, F3-21).
 *
 * documentos.views é dado comportamental pessoal (usuário + timestamp de
 * leitura) sem retenção. `documentos.purge_old_views()` agrega por
 * documento/mês linhas com mais de 6 meses e as remove da tabela
 * individual, preservando a contagem para métricas editoriais.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, documents, views, viewsMonthlyAgg } from "@hebron/db/schema";

const AUTHOR_ID = "d4000000-0000-0000-0000-000000000001";
const VIEWER_ID = "d4000000-0000-0000-0000-000000000002";
const DOC_ID = "d4000000-0000-0000-0000-000000000003";

const OLD_MONTH = new Date();
OLD_MONTH.setUTCMonth(OLD_MONTH.getUTCMonth() - 8, 15); // 8 meses atrás
const RECENT_DATE = new Date(); // hoje — dentro da janela de retenção

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      { id: AUTHOR_ID, email: "views-author@test.hebron", fullName: "Autor" },
      { id: VIEWER_ID, email: "views-viewer@test.hebron", fullName: "Leitor" },
    ])
    .onConflictDoNothing();

  await db
    .insert(documents)
    .values({
      id: DOC_ID,
      title: "Documento de teste de retenção",
      slug: "retencao-teste-views",
      visibility: "internal",
      authorId: AUTHOR_ID,
    })
    .onConflictDoNothing();

  // Duas visualizações antigas (mesmo mês) + uma recente.
  await db.insert(views).values([
    { documentId: DOC_ID, userId: VIEWER_ID, viewedAt: OLD_MONTH },
    { documentId: DOC_ID, userId: AUTHOR_ID, viewedAt: OLD_MONTH },
    { documentId: DOC_ID, userId: VIEWER_ID, viewedAt: RECENT_DATE },
  ]);
});

afterAll(async () => {
  await db.delete(views).where(eq(views.documentId, DOC_ID));
  await db
    .delete(viewsMonthlyAgg)
    .where(eq(viewsMonthlyAgg.documentId, DOC_ID));
  await db.delete(documents).where(eq(documents.id, DOC_ID));
  await db.delete(users).where(eq(users.id, AUTHOR_ID));
  await db.delete(users).where(eq(users.id, VIEWER_ID));
});

describe("documentos.purge_old_views()", () => {
  it("agrega visualizações com mais de 6 meses e apaga as linhas individuais", async () => {
    await db.execute(sql`SELECT documentos.purge_old_views()`);

    const remaining = await db
      .select()
      .from(views)
      .where(eq(views.documentId, DOC_ID));
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.viewedAt.getTime()).toBeCloseTo(
      RECENT_DATE.getTime(),
      -3,
    );

    const aggRows = await db
      .select()
      .from(viewsMonthlyAgg)
      .where(eq(viewsMonthlyAgg.documentId, DOC_ID));

    expect(aggRows).toHaveLength(1);
    expect(aggRows[0]?.viewCount).toBe(2);
  });

  it("é idempotente — rodar de novo não duplica a agregação nem quebra", async () => {
    await db.execute(sql`SELECT documentos.purge_old_views()`);

    const aggs = await db
      .select()
      .from(viewsMonthlyAgg)
      .where(eq(viewsMonthlyAgg.documentId, DOC_ID));
    expect(aggs).toHaveLength(1);
    expect(aggs[0]?.viewCount).toBe(2);
  });
});
