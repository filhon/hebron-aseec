"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { roleAssignments, designations } from "@hebron/db/schema";
import { findUserRoleConflict } from "@hebron/db/conflict-of-interest";
import type { Role } from "@hebron/types/roles";
import { adminAction } from "../lib/safe-action";
import { logAudit } from "../lib/audit";
import { notifyRoleChanged } from "../lib/notifications";

// ─── assignRole ───────────────────────────────────────────────────────────────

export const assignRole = adminAction
  .schema(
    z.object({
      userId: z.string().uuid(),
      role: z.enum([
        "super_admin",
        "diretor",
        "conselheiro",
        "colaborador",
        "submissor",
        "aluno",
        "hospede",
        "ouvinte",
      ]),
      scope: z
        .enum([
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
        ])
        .default("global"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const assignment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const conflict = await findUserRoleConflict(
          tx,
          parsedInput.userId,
          parsedInput.role as Role,
        );
        if (conflict) throw new BusinessError(conflict);

        // Prevent duplicate assignment (ignora atribuições já revogadas — uma
        // revogação anterior não pode bloquear uma nova concessão do mesmo papel)
        const existingRows = await tx
          .select({ id: roleAssignments.id })
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.userId, parsedInput.userId),
              eq(roleAssignments.role, parsedInput.role),
              eq(roleAssignments.scope, parsedInput.scope),
              isNull(roleAssignments.revokedAt),
            ),
          );

        if (existingRows[0]) {
          throw new BusinessError(
            "Este papel já foi atribuído ao usuário neste escopo",
          );
        }

        const inserted = await tx
          .insert(roleAssignments)
          .values({
            userId: parsedInput.userId,
            role: parsedInput.role,
            scope: parsedInput.scope,
            grantedBy: ctx.actorId,
          })
          .returning();

        const assignment = inserted[0];
        if (!assignment) throw new BusinessError("Falha ao atribuir papel");
        return assignment;
      },
    );

    await logAudit({
      actorId: ctx.actorId,
      action: "role.granted",
      entity: "role_assignment",
      entityId: assignment.id,
      diff: {
        after: {
          userId: assignment.userId,
          role: assignment.role,
          scope: assignment.scope,
        },
      },
    });

    await notifyRoleChanged(assignment.userId, assignment.role, "granted");

    return { assignment };
  });

// ─── revokeRole ───────────────────────────────────────────────────────────────

export const revokeRole = adminAction
  .schema(
    z.object({
      assignmentId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const assignment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const rows = await tx
          .select()
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.id, parsedInput.assignmentId),
              isNull(roleAssignments.revokedAt),
            ),
          );

        const assignment = rows[0];
        if (!assignment)
          throw new BusinessError(
            "Atribuição de papel não encontrada ou já revogada",
          );

        await tx
          .update(roleAssignments)
          .set({
            revokedAt: new Date(),
            revokedBy: ctx.actorId,
            revocationReason: parsedInput.reason ?? null,
          })
          .where(eq(roleAssignments.id, parsedInput.assignmentId));

        return assignment;
      },
    );

    await logAudit({
      actorId: ctx.actorId,
      action: "role.revoked",
      entity: "role_assignment",
      entityId: parsedInput.assignmentId,
      diff: {
        before: {
          userId: assignment.userId,
          role: assignment.role,
          scope: assignment.scope,
        },
        after: { reason: parsedInput.reason ?? null },
      },
    });

    await notifyRoleChanged(assignment.userId, assignment.role, "revoked");

    return { ok: true };
  });

// ─── updateDesignation ────────────────────────────────────────────────────────
// Designações especiais: gestor / autorizador.
// São configurações operacionais de diretores, não papéis.
// O audit log garante imutabilidade (registro permanente da operação).

export const updateDesignation = adminAction
  .schema(
    z.object({
      userId: z.string().uuid(),
      type: z.enum(["gestor", "autorizador"]),
      action: z.enum(["assign", "revoke"]),
      reason: z.string().max(500).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.action === "revoke") {
      const active = await withAuthenticatedContext(
        { actorId: ctx.actorId },
        async (tx) => {
          const activeRows = await tx
            .select()
            .from(designations)
            .where(
              and(
                eq(designations.userId, parsedInput.userId),
                eq(designations.type, parsedInput.type),
                isNull(designations.revokedAt),
              ),
            );

          const active = activeRows[0];
          if (!active)
            throw new BusinessError(
              "Designação ativa não encontrada para este usuário",
            );

          await tx
            .update(designations)
            .set({
              revokedAt: new Date(),
              revokedBy: ctx.actorId,
              revocationReason: parsedInput.reason ?? null,
            })
            .where(eq(designations.id, active.id));

          return active;
        },
      );

      await logAudit({
        actorId: ctx.actorId,
        action: "designation.revoked",
        entity: "designation",
        entityId: active.id,
        diff: {
          before: { userId: active.userId, type: active.type },
          after: { reason: parsedInput.reason ?? null },
        },
      });

      return { ok: true };
    }

    const designation = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        // assign — verify the user has a governance role
        const roleRows = await tx
          .select({ role: roleAssignments.role })
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.userId, parsedInput.userId),
              isNull(roleAssignments.revokedAt),
            ),
          );

        const hasGovernanceRole = roleRows.some(
          (r) => r.role === "diretor" || r.role === "conselheiro",
        );

        if (!hasGovernanceRole) {
          throw new BusinessError(
            "Apenas diretores ou conselheiros podem receber designações especiais",
          );
        }

        const inserted = await tx
          .insert(designations)
          .values({
            userId: parsedInput.userId,
            type: parsedInput.type,
            assignedBy: ctx.actorId,
          })
          .returning();

        const designation = inserted[0];
        if (!designation) throw new BusinessError("Falha ao criar designação");
        return designation;
      },
    );

    await logAudit({
      actorId: ctx.actorId,
      action: "designation.assigned",
      entity: "designation",
      entityId: designation.id,
      diff: {
        after: { userId: designation.userId, type: designation.type },
      },
    });

    return { designation };
  });
