"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@hebron/db/client";
import { tags } from "@hebron/db/schema";
import { editorAction } from "../lib/safe-action";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ─── listTags ─────────────────────────────────────────────────────────────────

export const listTags = editorAction.schema(z.object({})).action(async () => {
  const all = await db.select().from(tags).orderBy(tags.name);
  return { tags: all };
});

// ─── createTag ────────────────────────────────────────────────────────────────
// Idempotente por nome: se a tag já existe, retorna a existente em vez de
// duplicar (usado ao resolver tags criadas localmente no formulário antes do
// submit).

export const createTag = editorAction
  .schema(z.object({ name: z.string().min(1).max(60) }))
  .action(async ({ parsedInput }) => {
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.name, parsedInput.name))
      .limit(1);

    if (existing) return { tag: existing };

    const slug = `${slugify(parsedInput.name)}-${crypto.randomUUID().slice(0, 6)}`;
    const [tag] = await db
      .insert(tags)
      .values({ name: parsedInput.name, slug })
      .returning();

    if (!tag) throw new Error("Falha ao criar tag");
    return { tag };
  });
