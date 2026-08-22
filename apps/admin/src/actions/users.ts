"use server";

import React from "react";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { users, notifications, roleAssignments } from "@hebron/db/schema";
import { findUserRoleConflict } from "@hebron/db/conflict-of-interest";
import { getEmailTemplateBySlug } from "@hebron/db/email-templates";
import { createNotification, interpolateStoredTemplate } from "@hebron/email";
import { PasswordResetEmail } from "@hebron/email/templates/password-reset";
import { WelcomeEmail } from "@hebron/email/templates/welcome";
import { SignupRejectedEmail } from "@hebron/email/templates/signup-rejected";
import { adminAction } from "../lib/safe-action";
import { redactSensitiveFields } from "@hebron/db/audit";
import { logAudit, computeDiff } from "../lib/audit";
import { notifyUserSuspended } from "../lib/notifications";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new BusinessError("Variáveis Supabase não configuradas");
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

    if (authError) throw new BusinessError(authError.message);
    if (!authData.user)
      throw new BusinessError("Falha ao criar usuário no Auth");
    const authUser = authData.user;

    // public.users só tem policy de INSERT "auth.uid() = id" (self-insert,
    // pensada para o trigger de signup) — não existe policy de admin-insert.
    // O Admin criando conta para outra pessoa é privilégio legítimo, já
    // gated por adminAction (super_admin); withSystemRole replica aqui o
    // mesmo padrão de exceção documentado para admin.audit_log (F3-15/S-57).
    const newUser = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        withSystemRole(tx, async (sysTx) => {
          const inserted = await sysTx
            .insert(users)
            .values({
              id: authUser.id,
              email: parsedInput.email,
              fullName: parsedInput.fullName,
              phone: parsedInput.phone ?? null,
              documentCpf: parsedInput.documentCpf ?? null,
              suspendedModules: [],
            })
            .returning();

          const newUser = inserted[0];
          if (!newUser)
            throw new BusinessError("Falha ao inserir usuário no banco");
          return newUser;
        }),
    );

    await logAudit({
      actorId: ctx.actorId,
      action: "user.created",
      entity: "user",
      entityId: newUser.id,
      diff: {
        after: redactSensitiveFields({
          email: newUser.email,
          fullName: newUser.fullName,
        }),
      },
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
    // public.users só tem policy de UPDATE "auth.uid() = id" (self-update) —
    // não existe policy de admin-write. withSystemRole replica aqui o mesmo
    // padrão de exceção documentado para admin.audit_log (F3-15/S-57): a
    // leitura roda RLS-gated como authenticated, só a escrita privilegiada
    // troca de papel, dentro da mesma transação atômica.
    const { before, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const beforeRows = await tx
          .select()
          .from(users)
          .where(eq(users.id, parsedInput.id));

        const before = beforeRows[0];
        if (!before) throw new BusinessError("Usuário não encontrado");

        const patch: Partial<typeof users.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (parsedInput.fullName !== undefined)
          patch.fullName = parsedInput.fullName;
        if (parsedInput.phone !== undefined) patch.phone = parsedInput.phone;

        const updated = await withSystemRole(tx, async (sysTx) => {
          const updatedRows = await sysTx
            .update(users)
            .set(patch)
            .where(eq(users.id, parsedInput.id))
            .returning();

          const updated = updatedRows[0];
          if (!updated) throw new BusinessError("Falha ao atualizar usuário");
          return updated;
        });

        return { before, updated };
      },
    );

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
    // withSystemRole: public.users não tem policy de admin-write — mesmo
    // padrão de exceção de updateUser acima.
    const { before, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const beforeRows = await tx
          .select()
          .from(users)
          .where(eq(users.id, parsedInput.id));

        const before = beforeRows[0];
        if (!before) throw new BusinessError("Usuário não encontrado");

        const suspendedModules = parsedInput.modules.includes("global")
          ? ["global"]
          : parsedInput.modules;

        const updated = await withSystemRole(tx, async (sysTx) => {
          const updatedRows = await sysTx
            .update(users)
            .set({
              suspendedModules,
              suspendedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, parsedInput.id))
            .returning();

          const updated = updatedRows[0];
          if (!updated) throw new BusinessError("Falha ao suspender usuário");
          return updated;
        });

        return { before, updated };
      },
    );

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
    // withSystemRole: public.users não tem policy de admin-write — mesmo
    // padrão de exceção de updateUser acima.
    const { before, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const beforeRows = await tx
          .select()
          .from(users)
          .where(eq(users.id, parsedInput.id));

        const before = beforeRows[0];
        if (!before) throw new BusinessError("Usuário não encontrado");

        const removingAll = parsedInput.modules.includes("global");
        const suspendedModules = removingAll
          ? []
          : before.suspendedModules.filter(
              (m) =>
                !parsedInput.modules.includes(m as z.infer<typeof moduleEnum>),
            );

        const updated = await withSystemRole(tx, async (sysTx) => {
          const updatedRows = await sysTx
            .update(users)
            .set({
              suspendedModules,
              suspendedAt:
                suspendedModules.length === 0 ? null : before.suspendedAt,
              updatedAt: new Date(),
            })
            .where(eq(users.id, parsedInput.id))
            .returning();

          const updated = updatedRows[0];
          if (!updated) throw new BusinessError("Falha ao reativar usuário");
          return updated;
        });

        return { before, updated };
      },
    );

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

    const user = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const userRows = await tx
          .select()
          .from(users)
          .where(eq(users.id, parsedInput.id));

        const user = userRows[0];
        if (!user) throw new BusinessError("Usuário não encontrado");
        return user;
      },
    );

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
    });

    if (error) throw new BusinessError(error.message);

    const resetUrl = data.properties?.action_link;
    if (!resetUrl)
      throw new BusinessError("Falha ao gerar link de redefinição");

    // P-1.10c: admin.email_templates tem precedência sobre o componente
    // React Email hardcoded quando existe uma linha para o slug — mesmo
    // padrão de invitations.ts::sendInvitation.
    const resetTemplate = await getEmailTemplateBySlug("password-reset");
    let storedSubject: string | undefined;
    let storedHtml: string | undefined;
    if (resetTemplate) {
      const interpolated = interpolateStoredTemplate(resetTemplate, {
        nome: user.fullName ?? user.email,
        link: resetUrl,
      });
      storedSubject = interpolated.subject;
      storedHtml = interpolated.html;
    }

    // Exceção service-level (G6.3): notificação inserida via `db` (superuser)
    // em nome do usuário-alvo, não do ator — mesmo padrão de invitations.ts.
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
        if (!notif) throw new BusinessError("Falha ao inserir notificação");
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
        subject: storedSubject ?? "Redefinição de senha — Hebron Aseec",
        html: storedHtml,
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

    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const userRows = await tx
        .select()
        .from(users)
        .where(eq(users.id, parsedInput.id));

      const user = userRows[0];
      if (!user) throw new BusinessError("Usuário não encontrado");
    });

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

// ─── approveSignup ────────────────────────────────────────────────────────────
// Aprova um auto-signup pendente (status = pending_approval): confirma o
// e-mail, atribui o papel submissor e ativa a conta. Distinto de approveUser
// (que só confirma e-mail de contas criadas manualmente pelo Admin).

export const approveSignup = adminAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const user = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const userRows = await tx
          .select()
          .from(users)
          .where(eq(users.id, parsedInput.id));

        const user = userRows[0];
        if (!user) throw new BusinessError("Usuário não encontrado");
        if (user.status !== "pending_approval") {
          throw new BusinessError(
            "Este cadastro não está aguardando aprovação.",
          );
        }
        return user;
      },
    );

    const supabase = getSupabaseAdmin();
    await supabase.auth.admin.updateUserById(parsedInput.id, {
      email_confirm: true,
    });

    // withSystemRole no update de status: public.users não tem policy de
    // admin-write (mesmo padrão de updateUser). O INSERT em role_assignments
    // já é coberto por "role_assignments_write_super_admin" (has_role) —
    // roda normalmente como authenticated, sem bypass.
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      // D6-002 (PACOTE 9): terceiro caminho de concessão de papel — mesma
      // regra de assignRole/sendInvitation, aplicada por consistência mesmo
      // que hoje só exista um papel fixo ("submissor") para conta recém-criada.
      const conflict = await findUserRoleConflict(
        tx,
        parsedInput.id,
        "submissor",
      );
      if (conflict) throw new BusinessError(conflict);

      await withSystemRole(tx, (sysTx) =>
        sysTx
          .update(users)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(users.id, parsedInput.id)),
      );

      await tx.insert(roleAssignments).values({
        userId: parsedInput.id,
        role: "submissor",
        scope: "global",
        grantedBy: ctx.actorId,
      });
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";
    const loginUrl = `${appUrl}/login`;

    // P-1.10c: admin.email_templates tem precedência sobre o componente
    // React Email hardcoded quando existe uma linha para o slug — mesmo
    // slug "welcome" usado por apps/intranet/src/actions/invitations.ts::
    // acceptInvitation, já que ambos são o mesmo email conceitual de boas-
    // vindas (não há slug "signup-approved" separado semeado em P-1.10b).
    const welcomeTemplate = await getEmailTemplateBySlug("welcome");
    let storedSubject: string | undefined;
    let storedHtml: string | undefined;
    if (welcomeTemplate) {
      const interpolated = interpolateStoredTemplate(welcomeTemplate, {
        nome: user.fullName ?? user.email,
        link: loginUrl,
        papel: "submissor",
      });
      storedSubject = interpolated.subject;
      storedHtml = interpolated.html;
    }

    // Exceção service-level (G6.3): notificação inserida via `db` (superuser)
    // em nome do usuário-alvo, não do ator — mesmo padrão de invitations.ts.
    await createNotification({
      insert: async (data) => {
        const notifInserted = await db
          .insert(notifications)
          .values({
            userId: user.id,
            title: data.title,
            body: data.body,
          })
          .returning();
        const notif = notifInserted[0];
        if (!notif) throw new BusinessError("Falha ao inserir notificação");
        return { id: notif.id };
      },
      data: {
        userId: user.id,
        channel: "email",
        type: "user.approved",
        title: "Cadastro aprovado",
        body: "Seu cadastro na Hebron Aseec foi aprovado.",
      },
      email: {
        to: user.email,
        subject: storedSubject ?? "Cadastro aprovado — Hebron Aseec",
        html: storedHtml,
        template: React.createElement(WelcomeEmail, {
          name: user.fullName ?? user.email,
          roles: ["submissor"],
          loginUrl,
        }),
      },
      resendApiKey: process.env.RESEND_API_KEY,
    });

    await logAudit({
      actorId: ctx.actorId,
      action: "user.approved",
      entity: "user",
      entityId: parsedInput.id,
      diff: { status: { before: "pending_approval", after: "active" } },
    });

    return { ok: true };
  });

// ─── rejectSignup ─────────────────────────────────────────────────────────────
// Rejeita um auto-signup pendente. Estado soft (status = "rejected") — nunca
// exclusão: a instituição vinculada e o histórico permanecem para auditoria.

export const rejectSignup = adminAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    // withSystemRole no update de status: public.users não tem policy de
    // admin-write (mesmo padrão de updateUser).
    const user = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const userRows = await tx
          .select()
          .from(users)
          .where(eq(users.id, parsedInput.id));

        const user = userRows[0];
        if (!user) throw new BusinessError("Usuário não encontrado");
        if (user.status !== "pending_approval") {
          throw new BusinessError(
            "Este cadastro não está aguardando aprovação.",
          );
        }

        await withSystemRole(tx, (sysTx) =>
          sysTx
            .update(users)
            .set({ status: "rejected", updatedAt: new Date() })
            .where(eq(users.id, parsedInput.id)),
        );

        return user;
      },
    );

    // Exceção service-level (G6.3): notificação inserida via `db` (superuser)
    // em nome do usuário-alvo, não do ator — mesmo padrão de invitations.ts.
    await createNotification({
      insert: async (data) => {
        const notifInserted = await db
          .insert(notifications)
          .values({
            userId: user.id,
            title: data.title,
            body: data.body,
          })
          .returning();
        const notif = notifInserted[0];
        if (!notif) throw new BusinessError("Falha ao inserir notificação");
        return { id: notif.id };
      },
      data: {
        userId: user.id,
        channel: "email",
        type: "user.rejected",
        title: "Cadastro não aprovado",
        body: "Seu cadastro na Hebron Aseec não foi aprovado.",
      },
      email: {
        to: user.email,
        subject: "Cadastro — Hebron Aseec",
        template: React.createElement(SignupRejectedEmail, {
          name: user.fullName ?? user.email,
        }),
      },
      resendApiKey: process.env.RESEND_API_KEY,
    });

    await logAudit({
      actorId: ctx.actorId,
      action: "user.rejected",
      entity: "user",
      entityId: parsedInput.id,
      diff: { status: { before: "pending_approval", after: "rejected" } },
    });

    return { ok: true };
  });
