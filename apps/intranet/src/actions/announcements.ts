"use server";

import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { announcements, users } from "@hebron/db/schema";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@hebron/validators/intranet";
import { boardAction, staffAction, superAdminAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";
import { notifyUrgentAnnouncement } from "../lib/notifications";

// ---------------------------------------------------------------------------
// listAnnouncements — feed de anúncios (equipe interna). Teto de leitura
// (P-5.3b CORRETIVO): sem `limit`, cai no padrão ANNOUNCEMENTS_LIST_LIMIT —
// mesmo crescimento sem teto que P-4.6b fechou no painel de Atividade de
// Tarefas, aqui lido tanto por /anuncios quanto pelo painel (via
// getAnnouncementsWithAuthors, queries.ts).
// ---------------------------------------------------------------------------

// Não exportada: um arquivo "use server" só pode exportar funções async
// (Next.js). anuncios/page.tsx repete o mesmo valor para decidir o aviso de
// corte — mantenha os dois em sincronia.
const ANNOUNCEMENTS_LIST_LIMIT = 50;

export const listAnnouncements = staffAction
  .schema(z.object({ limit: z.number().int().min(1).max(200).optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const limit = parsedInput.limit ?? ANNOUNCEMENTS_LIST_LIMIT;
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(announcements)
          .orderBy(
            desc(announcements.publishedAt),
            desc(announcements.createdAt),
          )
          .limit(limit),
    );

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
    const announcement = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(announcements)
          .values({
            title: input.title,
            body: input.body,
            priority: input.priority,
            authorId: ctx.actorId,
            publishedAt: new Date(),
          })
          .returning();
        if (!row) throw new BusinessError("Falha ao criar anúncio");

        await withSystemRole(tx, (sysTx) =>
          logIntranetAudit(
            {
              actorId: ctx.actorId,
              action: "announcement.created",
              entity: "announcement",
              entityId: row.id,
              diff: { title: row.title, priority: row.priority },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

    // Anúncio urgente: in_app + email imediato a todos os internos
    // (critério de aceite P-5.10). Normal/importante ficam só no feed. O
    // anúncio já está commitado nesta altura — uma falha no fan-out (Resend
    // fora do ar, RESEND_API_KEY ausente, erro inesperado na resolução dos
    // destinatários) NUNCA vira erro genérico para quem acabou de publicar
    // (achado #2, P-5.10b). `emailFailures: null` sinaliza que nem a
    // contagem pôde ser confirmada — caso raro, já que falha de envio por
    // destinatário é tratada dentro de notifyUrgentAnnouncement.
    let emailFailures: number | null = null;
    if (announcement.priority === "urgente") {
      try {
        // Autor é sempre o próprio ator autenticado (authorId = ctx.actorId
        // acima) — leitura própria, coberta por users_select_own, sem exceção.
        const [author] = await withAuthenticatedContext(
          { actorId: ctx.actorId },
          (tx) =>
            tx
              .select({ fullName: users.fullName, email: users.email })
              .from(users)
              .where(eq(users.id, announcement.authorId))
              .limit(1),
        );

        const result = await notifyUrgentAnnouncement({
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          authorName: author?.fullName ?? author?.email ?? "Diretoria",
          publishedAt: announcement.publishedAt ?? new Date(),
        });
        emailFailures = result.emailFailures;
      } catch {
        emailFailures = null;
      }
    }

    return { announcement, emailFailures };
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
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(announcements)
          .where(eq(announcements.id, input.announcementId))
          .limit(1),
    );

    const existing = rows[0];
    if (!existing) throw new BusinessError("Anúncio não encontrado");

    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(announcements)
          .set({
            title: input.title,
            body: input.body,
            priority: input.priority,
            updatedAt: new Date(),
          })
          .where(eq(announcements.id, input.announcementId))
          .returning();
        if (!row) throw new BusinessError("Falha ao atualizar anúncio");

        await withSystemRole(tx, (sysTx) =>
          logIntranetAudit(
            {
              actorId: ctx.actorId,
              action: "announcement.updated",
              entity: "announcement",
              entityId: row.id,
              diff: {
                title: { before: existing.title, after: row.title },
                priority: { before: existing.priority, after: row.priority },
              },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

    return { announcement: updated };
  });
