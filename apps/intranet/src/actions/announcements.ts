"use server";

import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { announcements } from "@hebron/db/schema";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@hebron/validators/intranet";
import { boardAction, staffAction, superAdminAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// listAnnouncements — feed de anúncios (equipe interna).
// ---------------------------------------------------------------------------

export const listAnnouncements = staffAction
  .schema(z.object({}))
  .action(async () => {
    const rows = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.publishedAt), desc(announcements.createdAt));

    return { announcements: rows };
  });

// ---------------------------------------------------------------------------
// createAnnouncement — diretor/conselheiro/super_admin publicam
// (0037_intranet_rls.sql: announcements_insert_board). Autor é sempre quem
// está autenticado.
// ---------------------------------------------------------------------------

export const createAnnouncement = boardAction
  .schema(createAnnouncementSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [announcement] = await db
      .insert(announcements)
      .values({
        title: input.title,
        body: input.body,
        priority: input.priority,
        authorId: ctx.actorId,
        publishedAt: new Date(),
      })
      .returning();

    if (!announcement) throw new Error("Falha ao criar anúncio");

    await logIntranetAudit({
      actorId: ctx.actorId,
      action: "announcement.created",
      entity: "announcement",
      entityId: announcement.id,
      diff: { title: announcement.title, priority: announcement.priority },
    });

    return { announcement };
  });

// ---------------------------------------------------------------------------
// updateAnnouncement — correção de um anúncio já publicado. Sem hard delete
// (BRAIN "imutabilidade") nem coluna deleted_at modelada em announcements —
// 0037_intranet_rls.sql restringe UPDATE a super_admin
// (announcements_mutate_admin); diretor/conselheiro só têm INSERT.
// ---------------------------------------------------------------------------

export const updateAnnouncement = superAdminAction
  .schema(updateAnnouncementSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const rows = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, input.announcementId))
      .limit(1);

    const existing = rows[0];
    if (!existing) throw new Error("Anúncio não encontrado");

    const [updated] = await db
      .update(announcements)
      .set({
        title: input.title,
        body: input.body,
        priority: input.priority,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, input.announcementId))
      .returning();

    if (!updated) throw new Error("Falha ao atualizar anúncio");

    await logIntranetAudit({
      actorId: ctx.actorId,
      action: "announcement.updated",
      entity: "announcement",
      entityId: updated.id,
      diff: {
        title: { before: existing.title, after: updated.title },
        priority: { before: existing.priority, after: updated.priority },
      },
    });

    return { announcement: updated };
  });
