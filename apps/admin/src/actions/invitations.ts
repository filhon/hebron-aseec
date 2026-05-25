"use server";

import React from "react";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import crypto from "node:crypto";
import { invitations, notifications } from "@hebron/db/schema";
import { createNotification } from "@hebron/email";
import { adminAction } from "../lib/safe-action";
import { logAudit } from "../lib/audit";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado");
  const client = postgres(url, { prepare: false });
  return drizzle(client);
}

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
    const db = getDb();
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
        template: buildInvitationEmail({
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
    const db = getDb();

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

// ─── Inline email builder ─────────────────────────────────────────────────────
// Minimal React element for the invitation email.
// Replace with a proper React Email template from packages/email when available.

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  diretor: "Diretor",
  conselheiro: "Conselheiro",
  colaborador: "Colaborador",
  submissor: "Submissor",
  aluno: "Aluno",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

function buildInvitationEmail(params: {
  inviteUrl: string;
  roles: string[];
  message?: string;
  expiresAt: Date;
}): React.ReactElement {
  const rolesText = params.roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
  const expiryText = params.expiresAt.toLocaleDateString("pt-BR");

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: "Inter, sans-serif",
        color: "#111827",
        maxWidth: "600px",
        margin: "0 auto",
      },
    },
    React.createElement(
      "h1",
      { style: { color: "#202C85" } },
      "Convite para Hebron Aseec",
    ),
    params.message
      ? React.createElement("p", null, params.message)
      : React.createElement(
          "p",
          null,
          "Você foi convidado para acessar a plataforma Hebron Aseec.",
        ),
    React.createElement("p", null, `Papel(éis): ${rolesText}`),
    React.createElement("p", null, `Este convite expira em: ${expiryText}`),
    React.createElement(
      "a",
      {
        href: params.inviteUrl,
        style: {
          display: "inline-block",
          backgroundColor: "#202C85",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          marginTop: "16px",
        },
      },
      "Aceitar convite",
    ),
  );
}
