"use server";

import React from "react";
import { z } from "zod";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { invitations, notifications, users } from "@hebron/db/schema";
import { getEmailTemplateBySlug } from "@hebron/db/email-templates";
import { createNotification, interpolateStoredTemplate } from "@hebron/email";
import { InvitationEmail } from "@hebron/email/templates/invitation";
import { adminAction } from "../lib/safe-action";
import { logAudit } from "../lib/audit";
import { BusinessError } from "@hebron/auth/safe-action-error";

const roleEnum = z.enum([
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
  "submissor",
  "aluno",
  "hospede",
  "ouvinte",
]);

// ─── sendInvitation ───────────────────────────────────────────────────────────

export const sendInvitation = adminAction
  .schema(
    z.object({
      email: z.string().email(),
      roles: z.array(roleEnum).min(1, "Selecione pelo menos um papel"),
      message: z.string().max(500).optional(),
      expiresInDays: z.number().int().min(1).max(30).default(7),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsedInput.expiresInDays);

    const inserted = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .insert(invitations)
          .values({
            email: parsedInput.email,
            roles: parsedInput.roles,
            token,
            invitedBy: ctx.actorId,
            expiresAt,
          })
          .returning(),
    );

    const invitation = inserted[0];
    if (!invitation) throw new BusinessError("Falha ao criar convite");

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";
    const inviteUrl = `${appUrl}/convite?token=${token}`;

    // P-1.10c: admin.email_templates (editável pelo super_admin) tem
    // precedência sobre o componente React Email hardcoded — quando existe
    // linha para o slug, `email.html`/`email.subject` sobrescrevem
    // `email.template` em `send.ts`; sem linha, o componente segue como
    // fallback inalterado.
    const invitationTemplate = await getEmailTemplateBySlug("invitation");
    let storedSubject: string | undefined;
    let storedHtml: string | undefined;
    if (invitationTemplate) {
      const [inviter] = await db
        .select({ fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, ctx.actorId))
        .limit(1);

      const interpolated = interpolateStoredTemplate(invitationTemplate, {
        nome: inviter?.fullName ?? inviter?.email ?? "A administração",
        link: inviteUrl,
        papel: parsedInput.roles.join(", "),
      });
      storedSubject = interpolated.subject;
      storedHtml = interpolated.html;
    }

    // Dispatch email via Resend
    // Exceção service-level (G6.3): notificação criada com o `db` singleton
    // (superuser) em nome do destinatário do convite — não do ator autenticado —
    // e admin.audit_log é escrito via @hebron/db/audit, que já roda como
    // service role. Nenhum dos dois participa da migração RLS deste prompt.
    await createNotification({
      insert: async (data) => {
        const notifInserted = await db
          .insert(notifications)
          .values({
            userId: ctx.actorId,
            title: data.title,
            body: data.body,
          })
          .returning();
        const notif = notifInserted[0];
        if (!notif) throw new BusinessError("Falha ao inserir notificação");
        return { id: notif.id };
      },
      data: {
        userId: ctx.actorId,
        channel: "email",
        type: "invitation.created",
        title: "Convite para Hebron Aseec",
        body:
          parsedInput.message ??
          "Você foi convidado para a plataforma Hebron Aseec.",
      },
      email: {
        to: parsedInput.email,
        subject: storedSubject ?? "Convite para Hebron Aseec",
        html: storedHtml,
        template: React.createElement(InvitationEmail, {
          inviteUrl,
          roles: parsedInput.roles,
          message: parsedInput.message,
          expiresAt,
        }),
      },
      resendApiKey: process.env.RESEND_API_KEY,
    });

    await logAudit({
      actorId: ctx.actorId,
      action: "invitation.created",
      entity: "invitation",
      entityId: invitation.id,
      diff: {
        after: {
          email: invitation.email,
          roles: invitation.roles,
          expiresAt: invitation.expiresAt,
        },
      },
    });

    return { invitation };
  });

// ─── revokeInvitation ─────────────────────────────────────────────────────────

export const revokeInvitation = adminAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .update(invitations)
          .set({ revokedAt: new Date() })
          .where(eq(invitations.id, parsedInput.id))
          .returning(),
    );

    const invitation = updated[0];
    if (!invitation) throw new BusinessError("Convite não encontrado");

    await logAudit({
      actorId: ctx.actorId,
      action: "invitation.revoked",
      entity: "invitation",
      entityId: invitation.id,
      diff: { revokedAt: { before: null, after: invitation.revokedAt } },
    });

    return { invitation };
  });

// acceptInvitation moved to apps/intranet/src/actions/invitations.ts — that's
// where the public /convite route lives (canonical login/signup entry point,
// see BRAIN.md), and it's also where account creation + role assignment now
// actually happen (P-1.26). Keeping a second, non-account-creating version
// here would just be a stale duplicate no UI ever calls.
