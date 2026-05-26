"use server";

import React from "react";
import { z } from "zod";
import { and, eq, isNull, gt } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@hebron/db/client";
import { invitations, notifications } from "@hebron/db/schema";
import { createNotification } from "@hebron/email";
import { InvitationEmail } from "@hebron/email/templates/invitation";
import { WelcomeEmail } from "@hebron/email/templates/welcome";
import { adminAction, publicAction } from "../lib/safe-action";
import { logAudit } from "../lib/audit";
import { notifyInvitationAccepted } from "../lib/notifications";

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

    const inserted = await db
      .insert(invitations)
      .values({
        email: parsedInput.email,
        roles: parsedInput.roles,
        token,
        invitedBy: ctx.actorId,
        expiresAt,
      })
      .returning();

    const invitation = inserted[0];
    if (!invitation) throw new Error("Falha ao criar convite");

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";
    const inviteUrl = `${appUrl}/convite?token=${token}`;

    // Dispatch email via Resend
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
        if (!notif) throw new Error("Falha ao inserir notificação");
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
        subject: "Convite para Hebron Aseec",
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
    const updated = await db
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(eq(invitations.id, parsedInput.id))
      .returning();

    const invitation = updated[0];
    if (!invitation) throw new Error("Convite não encontrado");

    await logAudit({
      actorId: ctx.actorId,
      action: "invitation.revoked",
      entity: "invitation",
      entityId: invitation.id,
      diff: { revokedAt: { before: null, after: invitation.revokedAt } },
    });

    return { invitation };
  });

// ─── acceptInvitation ─────────────────────────────────────────────────────────

export const acceptInvitation = publicAction
  .schema(
    z.object({
      token: z.string().min(1),
      name: z.string().min(1).max(255),
    }),
  )
  .action(async ({ parsedInput }) => {
    const now = new Date();

    // Fetch and validate the invitation
    const rows = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, parsedInput.token),
          isNull(invitations.revokedAt),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, now),
        ),
      )
      .limit(1);

    const invitation = rows[0];
    if (!invitation) {
      throw new Error("Convite inválido, expirado ou já utilizado.");
    }

    // Mark as accepted
    await db
      .update(invitations)
      .set({ acceptedAt: now })
      .where(eq(invitations.id, invitation.id));

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";

    // Send welcome email to the new user
    await createNotification({
      insert: async (data) => {
        const notifInserted = await db
          .insert(notifications)
          .values({
            userId: invitation.invitedBy,
            title: data.title,
            body: data.body,
          })
          .returning();
        const notif = notifInserted[0];
        if (!notif)
          throw new Error("Falha ao inserir notificação de boas-vindas");
        return { id: notif.id };
      },
      data: {
        userId: invitation.invitedBy,
        channel: "email",
        type: "invitation.welcome",
        title: "Bem-vindo(a) à Hebron Aseec",
        body: `Olá ${parsedInput.name}, sua conta foi ativada.`,
      },
      email: {
        to: invitation.email,
        subject: "Bem-vindo(a) à Hebron Aseec",
        template: React.createElement(WelcomeEmail, {
          name: parsedInput.name,
          roles: invitation.roles as string[],
          loginUrl: `${appUrl}/login`,
        }),
      },
      resendApiKey: process.env.RESEND_API_KEY,
    });

    // Notify the admin who sent the invite (in_app)
    await notifyInvitationAccepted(invitation.invitedBy, invitation.email);

    await logAudit({
      actorId: invitation.invitedBy,
      action: "invitation.accepted",
      entity: "invitation",
      entityId: invitation.id,
      diff: { acceptedAt: { before: null, after: now } },
    });

    return { email: invitation.email, roles: invitation.roles };
  });
