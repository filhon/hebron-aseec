"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { organizations, organizationMembers } from "@hebron/db/schema";
import {
  submissorAction,
  diretorAction,
  projetosAction,
} from "../lib/safe-action";
import { logProjectAudit, computeDiff } from "../lib/audit";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createOrganizationSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos numéricos")
    .optional()
    .nullable(),
  endereco: z.string().max(500).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  responsavelLegal: z.string().max(200).optional().nullable(),
  denominacao: z.string().max(200).optional().nullable(),
  estatutoUrl: z.string().url("URL inválida").optional().nullable(),
});

const updateOrganizationSchema = z.object({
  id: z.string().uuid("ID inválido"),
  nome: z.string().min(2).max(200).optional(),
  cnpj: z
    .string()
    .regex(/^\d{14}$/)
    .optional()
    .nullable(),
  endereco: z.string().max(500).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  responsavelLegal: z.string().max(200).optional().nullable(),
  denominacao: z.string().max(200).optional().nullable(),
  estatutoUrl: z.string().url().optional().nullable(),
});

const memberSchema = z.object({
  organizationId: z.string().uuid("Organização inválida"),
  userId: z.string().uuid("Usuário inválido"),
});

// ---------------------------------------------------------------------------
// createOrganization
// ---------------------------------------------------------------------------

export const createOrganization = submissorAction
  .schema(createOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const org = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const inserted = await tx
          .insert(organizations)
          .values({
            nome: parsedInput.nome,
            cnpj: parsedInput.cnpj ?? null,
            endereco: parsedInput.endereco ?? null,
            telefone: parsedInput.telefone ?? null,
            responsavelLegal: parsedInput.responsavelLegal ?? null,
            denominacao: parsedInput.denominacao ?? null,
            estatutoUrl: parsedInput.estatutoUrl ?? null,
            createdBy: ctx.actorId,
          })
          .returning();

        const org = inserted[0];
        if (!org) throw new Error("Falha ao criar organização");

        // Auto-add creator as member
        await tx.insert(organizationMembers).values({
          organizationId: org.id,
          userId: ctx.actorId,
        });

        return org;
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "organization.created",
      entity: "organization",
      entityId: org.id,
      diff: { after: { nome: org.nome, cnpj: org.cnpj } },
    });

    return { organization: org };
  });

// ---------------------------------------------------------------------------
// updateOrganization — creator OR diretor/super_admin
//
// Decisão P-2.8c (perguntado ao Filipe, ver SESSIONS.md): dados cadastrais
// da organização são self-service de quem a criou — a diretoria também pode
// corrigi-los, mas não precisa ser acionada para cada edição. O gate mirroa
// exatamente a RLS "organizations_update_owner_or_admin" (0007_projetos.sql:
// created_by = auth.uid() OR has_role('super_admin','diretor')) — por isso
// usa `projetosAction` (qualquer autenticado) e valida a posse no handler,
// não um client de papel fixo: nem todo criador tem o papel "diretor", e
// nem todo diretor é o criador.
// ---------------------------------------------------------------------------

export const updateOrganization = projetosAction
  .schema(updateOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { before, after } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const rows = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, parsedInput.id))
          .limit(1);

        const before = rows[0];
        if (!before) throw new Error("Organização não encontrada");

        const isPrivileged =
          ctx.roles.includes("super_admin") || ctx.roles.includes("diretor");
        if (!isPrivileged && before.createdBy !== ctx.actorId) {
          throw new Error(
            "Apenas quem cadastrou a organização ou a diretoria pode editar seus dados",
          );
        }

        const patch: Partial<typeof organizations.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (parsedInput.nome !== undefined) patch.nome = parsedInput.nome;
        if (parsedInput.cnpj !== undefined)
          patch.cnpj = parsedInput.cnpj ?? null;
        if (parsedInput.endereco !== undefined)
          patch.endereco = parsedInput.endereco ?? null;
        if (parsedInput.telefone !== undefined)
          patch.telefone = parsedInput.telefone ?? null;
        if (parsedInput.responsavelLegal !== undefined)
          patch.responsavelLegal = parsedInput.responsavelLegal ?? null;
        if (parsedInput.denominacao !== undefined)
          patch.denominacao = parsedInput.denominacao ?? null;
        if (parsedInput.estatutoUrl !== undefined)
          patch.estatutoUrl = parsedInput.estatutoUrl ?? null;

        const updated = await tx
          .update(organizations)
          .set(patch)
          .where(eq(organizations.id, parsedInput.id))
          .returning();

        const after = updated[0];
        if (!after) throw new Error("Falha ao atualizar organização");

        return { before, after };
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "organization.updated",
      entity: "organization",
      entityId: parsedInput.id,
      diff: computeDiff(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      ),
    });

    return { organization: after };
  });

// ---------------------------------------------------------------------------
// addOrganizationMember — diretor/super_admin only
//
// Decisão P-2.8c (ver SESSIONS.md): diferente de updateOrganization, a
// lista de membros NÃO é self-service do criador — ela decide quem enxerga
// os projetos da organização (RLS projects_select_own_or_org,
// 0007_projetos_rls.sql), então é ato de governança, não de cadastro.
// Mirrora a RLS "org_members_write_admin" (has_role('super_admin','diretor')).
// ---------------------------------------------------------------------------

export const addOrganizationMember = diretorAction
  .schema(memberSchema)
  .action(async ({ parsedInput, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      // Verify org exists
      const orgRows = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, parsedInput.organizationId))
        .limit(1);

      if (!orgRows[0]) throw new Error("Organização não encontrada");

      await tx
        .insert(organizationMembers)
        .values({
          organizationId: parsedInput.organizationId,
          userId: parsedInput.userId,
        })
        .onConflictDoNothing();
    });

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "organization.updated",
      entity: "organization_member",
      entityId: parsedInput.organizationId,
      diff: {
        after: {
          action: "member_added",
          userId: parsedInput.userId,
        },
      },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// removeOrganizationMember — diretor/super_admin only (cannot remove last member)
//
// Mesma decisão de governança de addOrganizationMember (P-2.8c, ver
// SESSIONS.md): remover representante afeta quem enxerga os projetos da
// organização, então não é self-service do criador.
// ---------------------------------------------------------------------------

export const removeOrganizationMember = diretorAction
  .schema(memberSchema)
  .action(async ({ parsedInput, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      // Count remaining members
      const memberRows = await tx
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          eq(organizationMembers.organizationId, parsedInput.organizationId),
        );

      if (memberRows.length <= 1) {
        throw new Error(
          "Não é possível remover o último membro da organização",
        );
      }

      await tx
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, parsedInput.organizationId),
            eq(organizationMembers.userId, parsedInput.userId),
          ),
        );
    });

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "organization.updated",
      entity: "organization_member",
      entityId: parsedInput.organizationId,
      diff: {
        after: {
          action: "member_removed",
          userId: parsedInput.userId,
        },
      },
    });

    return { ok: true };
  });
