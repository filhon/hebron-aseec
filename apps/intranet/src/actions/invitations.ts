"use server";

import React from "react";
import { z } from "zod";
import { and, eq, isNull, gt } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import { invitations, roleAssignments } from "@hebron/db/schema";
import { createNotification } from "@hebron/email";
import { WelcomeEmail } from "@hebron/email/templates/welcome";
import { publicAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";
import { notifyInvitationAccepted } from "../lib/notifications";
import { makeNotificationInserter } from "@hebron/db/notifications";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getSupabaseAdmin() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

const insertNotification = makeNotificationInserter();

// ─── acceptInvitation ─────────────────────────────────────────────────────────
// Fecha o órfão O-1/F2-A3: até aqui, aceitar um convite marcava a linha como
// aceita mas nunca criava a conta no Auth nem atribuía os papéis — ninguém
// novo conseguia de fato entrar no sistema (AUDIT/02-codigo-admin.md).

export const acceptInvitation = publicAction
  .schema(
    z.object({
      token: z.string().min(1),
      name: z.string().min(2, "Informe seu nome completo").max(255),
      password: z
        .string()
        .min(8, "A senha deve ter pelo menos 8 caracteres")
        .max(72),
    }),
  )
  .action(async ({ parsedInput }) => {
    const now = new Date();

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

    const roles = invitation.roles as string[];
    if (roles.length === 0) {
      throw new Error(
        "Convite sem papéis atribuídos — contate a administração.",
      );
    }

    // Cria a conta já confirmada — o convite em si é o vetting; não passa
    // signup_source, então public.users nasce com status default ('active').
    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: invitation.email,
        password: parsedInput.password,
        email_confirm: true,
        user_metadata: { full_name: parsedInput.name },
      });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Falha ao criar a conta.");

    const userId = authData.user.id;

    // O trigger on_auth_user_created já espelhou o usuário em public.users
    // (na mesma transação do INSERT em auth.users) — só falta o papel.
    await db.insert(roleAssignments).values(
      roles.map((role) => ({
        userId,
        role: role as (typeof roleAssignments.$inferInsert)["role"],
        scope: "global" as const,
        grantedBy: invitation.invitedBy,
      })),
    );

    await db
      .update(invitations)
      .set({ acceptedAt: now })
      .where(eq(invitations.id, invitation.id));

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";

    await createNotification({
      insert: (data) => insertNotification(data),
      data: {
        userId,
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
          roles,
          loginUrl: `${appUrl}/login`,
        }),
      },
      resendApiKey: process.env.RESEND_API_KEY,
    });

    await notifyInvitationAccepted(invitation.invitedBy, invitation.email);

    await logIntranetAudit({
      actorId: userId,
      action: "invitation.accepted",
      entity: "invitation",
      entityId: invitation.id,
      diff: {
        acceptedAt: { before: null, after: now },
        after: { userId, roles },
      },
    });

    return { email: invitation.email, roles };
  });
