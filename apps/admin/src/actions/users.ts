"use server";

import React from "react";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import { users, notifications } from "@hebron/db/schema";
import { createNotification } from "@hebron/email";
import { PasswordResetEmail } from "@hebron/email/templates/password-reset";
import { adminAction } from "../lib/safe-action";
import { logAudit, computeDiff } from "../lib/audit";
import { notifyUserSuspended } from "../lib/notifications";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

const moduleEnum = z.enum([
  "global",
  "admin",
  "projetos",
  "plataforma",
  "radio",
  "financeiro",
  "intranet",
  "documentos",
  "flats",
  "tarefas",
]);

// ─── createUser ───────────────────────────────────────────────────────────────

export const createUser = adminAction
  .schema(
    z.object({
      fullName: z.string().min(2).max(120),
      email: z.string().email(),
      phone: z.string().max(20).optional(),
      documentCpf: z.string().length(11).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: parsedInput.email,
        email_confirm: false,
        user_metadata: { full_name: parsedInput.fullName },
      });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Falha ao criar usuário no Auth");

    const inserted = await db
      .insert(users)
      .values({
        id: authData.user.id,
        email: parsedInput.email,
        fullName: parsedInput.fullName,
        phone: parsedInput.phone ?? null,
        documentCpf: parsedInput.documentCpf ?? null,
        suspendedModules: [],
      })
      .returning();

    const newUser = inserted[0];
    if (!newUser) throw new Error("Falha ao inserir usuário no banco");

    await logAudit({
      actorId: ctx.actorId,
      action: "user.created",
      entity: "user",
      entityId: newUser.id,
      diff: { after: { email: newUser.email, fullName: newUser.fullName } },
    });

    return { user: newUser };
  });

// ─── updateUser ───────────────────────────────────────────────────────────────

export const updateUser = adminAction
  .schema(
    z.object({
      id: z.string().uuid(),
      fullName: z.string().min(2).max(120).optional(),
      phone: z.string().max(20).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const beforeRows = await db
      .select()
      .from(users)
      .where(eq(users.id, parsedInput.id));

    const before = beforeRows[0];
    if (!before) throw new Error("Usuário não encontrado");

    const patch: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsedInput.fullName !== undefined)
      patch.fullName = parsedInput.fullName;
    if (parsedInput.phone !== undefined) patch.phone = parsedInput.phone;

    const updatedRows = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, parsedInput.id))
      .returning();

    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao atualizar usuário");

    await logAudit({
      actorId: ctx.actorId,
      action: "user.updated",
      entity: "user",
      entityId: parsedInput.id,
      diff: computeDiff(
        before as Record<string, unknown>,
        updated as Record<string, unknown>,
      ),
    });

    return { user: updated };
  });

// ─── suspendUser ─────────────────────────────────────────────────────────────
// Suspensão granular por módulo — lista armazenada em users.suspended_modules.
// "global" suspende acesso a todos os módulos.

export const suspendUser = adminAction
  .schema(
    z.object({
      id: z.string().uuid(),
      modules: z
        .array(moduleEnum)
        .min(1, "Informe ao menos um módulo para suspender"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const beforeRows = await db
      .select()
      .from(users)
      .where(eq(users.id, parsedInput.id));

    const before = beforeRows[0];
    if (!before) throw new Error("Usuário não encontrado");

    const suspendedModules = parsedInput.modules.includes("global")
      ? ["global"]
      : parsedInput.modules;

    const updatedRows = await db
      .update(users)
      .set({
        suspendedModules,
        suspendedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsedInput.id))
      .returning();

    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao suspender usuário");

    await logAudit({
      actorId: ctx.actorId,
      action: "user.suspended",
      entity: "user",
      entityId: parsedInput.id,
      diff: {
        suspendedModules: {
          before: before.suspendedModules,
          after: updated.suspendedModules,
        },
      },
    });

    await notifyUserSuspended(updated.id, updated.suspendedModules);

    return { user: updated };
  });

// ─── unsuspendUser ────────────────────────────────────────────────────────────

export const unsuspendUser = adminAction
  .schema(
    z.object({
      id: z.string().uuid(),
      modules: z.array(moduleEnum).min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const beforeRows = await db
      .select()
      .from(users)
      .where(eq(users.id, parsedInput.id));

    const before = beforeRows[0];
    if (!before) throw new Error("Usuário não encontrado");

    const removingAll = parsedInput.modules.includes("global");
    const suspendedModules = removingAll
      ? []
      : before.suspendedModules.filter(
          (m) => !parsedInput.modules.includes(m as z.infer<typeof moduleEnum>),
        );

    const updatedRows = await db
      .update(users)
      .set({
        suspendedModules,
        suspendedAt: suspendedModules.length === 0 ? null : before.suspendedAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsedInput.id))
      .returning();

    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao reativar usuário");

    await logAudit({
      actorId: ctx.actorId,
      action: "user.updated",
      entity: "user",
      entityId: parsedInput.id,
      diff: {
        suspendedModules: {
          before: before.suspendedModules,
          after: updated.suspendedModules,
        },
      },
    });

    return { user: updated };
  });

// ─── resetPassword ────────────────────────────────────────────────────────────

export const resetPassword = adminAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, parsedInput.id));

    const user = userRows[0];
    if (!user) throw new Error("Usuário não encontrado");

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
    });

    if (error) throw new Error(error.message);

    const resetUrl = data.properties?.action_link;
    if (!resetUrl) throw new Error("Falha ao gerar link de redefinição");

    await createNotification({
      insert: async (notifData) => {
        const notifInserted = await db
          .insert(notifications)
          .values({
            userId: user.id,
            title: notifData.title,
            body: notifData.body,
          })
          .returning();
        const notif = notifInserted[0];
        if (!notif) throw new Error("Falha ao inserir notificação");
        return { id: notif.id };
      },
      data: {
        userId: user.id,
        channel: "email",
        type: "user.password_reset",
        title: "Redefinição de senha",
        body: "Um link de redefinição de senha foi enviado para seu e-mail.",
      },
      email: {
        to: user.email,
        subject: "Redefinição de senha — Hebron Aseec",
        template: React.createElement(PasswordResetEmail, {
          resetUrl,
          name: user.fullName ?? undefined,
        }),
      },
      resendApiKey: process.env.RESEND_API_KEY,
    });

    await logAudit({
      actorId: ctx.actorId,
      action: "user.updated",
      entity: "user",
      entityId: parsedInput.id,
      diff: { passwordReset: { before: null, after: "link_gerado" } },
    });

    return { ok: true };
  });

// ─── approveUser ─────────────────────────────────────────────────────────────

export const approveUser = adminAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, parsedInput.id));

    const user = userRows[0];
    if (!user) throw new Error("Usuário não encontrado");

    await supabase.auth.admin.updateUserById(parsedInput.id, {
      email_confirm: true,
    });

    await logAudit({
      actorId: ctx.actorId,
      action: "user.approved",
      entity: "user",
      entityId: parsedInput.id,
      diff: { approved: { before: false, after: true } },
    });

    return { ok: true };
  });
