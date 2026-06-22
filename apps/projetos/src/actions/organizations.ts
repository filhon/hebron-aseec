"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { organizations, organizationMembers } from "@hebron/db/schema";
import { submissorAction, diretorAction } from "../lib/safe-action";
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
    const inserted = await db
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
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: ctx.actorId,
    });

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
// ---------------------------------------------------------------------------

export const updateOrganization = diretorAction
  .schema(updateOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const rows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, parsedInput.id))
      .limit(1);

    const before = rows[0];
    if (!before) throw new Error("Organização não encontrada");

    const patch: Partial<typeof organizations.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsedInput.nome !== undefined) patch.nome = parsedInput.nome;
    if (parsedInput.cnpj !== undefined) patch.cnpj = parsedInput.cnpj ?? null;
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

    const updated = await db
      .update(organizations)
      .set(patch)
      .where(eq(organizations.id, parsedInput.id))
      .returning();

    const after = updated[0];
    if (!after) throw new Error("Falha ao atualizar organização");

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
// addOrganizationMember — diretor or the org creator
// ---------------------------------------------------------------------------

export const addOrganizationMember = diretorAction
  .schema(memberSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Verify org exists
    const orgRows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, parsedInput.organizationId))
      .limit(1);

    if (!orgRows[0]) throw new Error("Organização não encontrada");

    await db
      .insert(organizationMembers)
      .values({
        organizationId: parsedInput.organizationId,
        userId: parsedInput.userId,
      })
      .onConflictDoNothing();

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
// removeOrganizationMember — diretor only (cannot remove self if last member)
// ---------------------------------------------------------------------------

export const removeOrganizationMember = diretorAction
  .schema(memberSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Count remaining members
    const memberRows = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        eq(organizationMembers.organizationId, parsedInput.organizationId),
      );

    if (memberRows.length <= 1) {
      throw new Error("Não é possível remover o último membro da organização");
    }

    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, parsedInput.organizationId),
          eq(organizationMembers.userId, parsedInput.userId),
        ),
      );

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
