"use server";

import { z } from "zod";
import { eq, and, isNull, count } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  projects,
  projectVersions,
  compactVersions,
  contestations,
  projectAttachments,
  notifications,
  organizations,
  systemSettings,
} from "@hebron/db/schema";
import { VALID_STAGE_TRANSITIONS } from "@hebron/db/schema";
import type { ProjectStage } from "@hebron/db/schema";
import {
  createAnnualProjectSchema,
  createPunctualProjectSchema,
  deleteProjectSchema,
} from "@hebron/validators/projetos";
import {
  scoreProject,
  DEFAULT_SCORING_CRITERIA,
} from "@hebron/ai/projects/scoring";
import {
  generateCompactVersion,
  DEFAULT_COMPACT_TEMPLATE,
} from "@hebron/ai/projects/compact-version";
import type {
  ScoringCriteria,
  ProjectScoringInput,
} from "@hebron/ai/projects/scoring";
import type {
  CompactVersionTemplate,
  CompactVersionInput,
} from "@hebron/ai/projects/compact-version";
import {
  submissorAction,
  diretorAction,
  projetosAction,
} from "../lib/safe-action";
import { logProjectAudit, computeDiff } from "../lib/audit";
import {
  generatePaymentSchedule,
  onProjectApproved,
} from "@hebron/db/projetos-approval";
import { onProjectSubmitted } from "@hebron/integrations/projetos-tarefas";
import { checkOrganizationBudget } from "@hebron/integrations/projetos";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getProjectOrThrow(projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  const project = rows[0];
  if (!project) throw new Error("Projeto não encontrado");
  return project;
}

async function getNextVersionNumber(projectId: string): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));

  return (result[0]?.total ?? 0) + 1;
}

async function createVersionSnapshot(
  projectId: string,
  stage: ProjectStage,
  data: Record<string, unknown>,
  createdBy: string,
): Promise<void> {
  const versionNumber = await getNextVersionNumber(projectId);
  await db.insert(projectVersions).values({
    projectId,
    versionNumber,
    stage,
    data,
    createdBy,
  });
}

async function lookupCategoryId(slug: string): Promise<string | null> {
  const { projectCategories } = await import("@hebron/db/schema");
  const rows = await db
    .select({ id: projectCategories.id })
    .from(projectCategories)
    .where(eq(projectCategories.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function loadScoringCriteria(): Promise<ScoringCriteria> {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "projetos_scoring_criteria"))
    .limit(1);

  if (!rows[0]) return DEFAULT_SCORING_CRITERIA;
  return (rows[0].value as ScoringCriteria | null) ?? DEFAULT_SCORING_CRITERIA;
}

async function loadCompactTemplate(): Promise<CompactVersionTemplate> {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "projetos_compact_template"))
    .limit(1);

  if (!rows[0]) return DEFAULT_COMPACT_TEMPLATE;
  return (
    (rows[0].value as CompactVersionTemplate | null) ?? DEFAULT_COMPACT_TEMPLATE
  );
}

// ---------------------------------------------------------------------------
// createAnnualDraft — submissor creates an annual project draft
// ---------------------------------------------------------------------------

export const createAnnualDraft = submissorAction
  .schema(createAnnualProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const year = parsedInput.anoReferencia;
    const categoryId = await lookupCategoryId(parsedInput.categoria);

    const inserted = await db
      .insert(projects)
      .values({
        title: parsedInput.titulo,
        tipo: "anual",
        stage: "rascunho",
        categoryId,
        organizationId: parsedInput.organizacaoId,
        submitterId: ctx.actorId,
        editalId: parsedInput.editalId ?? null,
        parentProjectId: parsedInput.parentProjectId ?? null,
        objectives: parsedInput.objetivos,
        justification: parsedInput.justificativa,
        targetAudience: parsedInput.beneficiariosDescricao,
        expectedResults: parsedInput.resultadosEsperados,
        ministryRegion: parsedInput.regiao,
        ministryArea: parsedInput.pais,
        budgetTotal: parsedInput.valorTotal.toString(),
        parcelas: parsedInput.numeroParcelas,
        meses: parsedInput.mesesPagamento.length,
        evaluationYear: year,
      })
      .returning();

    const project = inserted[0];
    if (!project) throw new Error("Falha ao criar projeto");

    // Store full form data (including fields without DB columns) in version 1
    await createVersionSnapshot(
      project.id,
      "rascunho",
      { ...parsedInput, _source: "createAnnualDraft" },
      ctx.actorId,
    );

    if (parsedInput.attachments?.length) {
      await db.insert(projectAttachments).values(
        parsedInput.attachments.map((a) => ({
          projectId: project.id,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize ?? null,
          uploadedBy: ctx.actorId,
        })),
      );
    }

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.created",
      entity: "project",
      entityId: project.id,
      diff: {
        after: {
          titulo: project.title,
          tipo: "anual",
          stage: "rascunho",
          evaluationYear: year,
          organizationId: project.organizationId,
          attachmentsCount: parsedInput.attachments?.length ?? 0,
        },
      },
    });

    return { project };
  });

// ---------------------------------------------------------------------------
// createPunctualDraft — submissor creates a pontual (emergency) project draft
// ---------------------------------------------------------------------------

export const createPunctualDraft = submissorAction
  .schema(createPunctualProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const categoryId = await lookupCategoryId(parsedInput.categoria);
    const year = new Date().getFullYear();

    const inserted = await db
      .insert(projects)
      .values({
        title: parsedInput.titulo,
        tipo: "pontual",
        stage: "rascunho",
        categoryId,
        organizationId: parsedInput.organizacaoId,
        submitterId: ctx.actorId,
        editalId: parsedInput.editalId ?? null,
        parentProjectId: parsedInput.parentProjectId ?? null,
        objectives: parsedInput.descricao ?? null,
        justification: parsedInput.motivoEmergencial,
        ministryRegion: parsedInput.regiao ?? null,
        ministryArea: parsedInput.pais ?? null,
        budgetTotal: parsedInput.valorTotal.toString(),
        parcelas: 1,
        meses: 1,
        evaluationYear: year,
      })
      .returning();

    const project = inserted[0];
    if (!project) throw new Error("Falha ao criar projeto pontual");

    await createVersionSnapshot(
      project.id,
      "rascunho",
      { ...parsedInput, _source: "createPunctualDraft" },
      ctx.actorId,
    );

    if (parsedInput.attachments?.length) {
      await db.insert(projectAttachments).values(
        parsedInput.attachments.map((a) => ({
          projectId: project.id,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize ?? null,
          uploadedBy: ctx.actorId,
        })),
      );
    }

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.created",
      entity: "project",
      entityId: project.id,
      diff: {
        after: {
          titulo: project.title,
          tipo: "pontual",
          stage: "rascunho",
          organizationId: project.organizationId,
          attachmentsCount: parsedInput.attachments?.length ?? 0,
        },
      },
    });

    return { project };
  });

// ---------------------------------------------------------------------------
// updateDraftProject — edit a project while it is still a rascunho
// ---------------------------------------------------------------------------

const updateDraftSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  title: z.string().min(5).max(200).optional(),
  objectives: z.string().min(50).max(5000).optional(),
  justification: z.string().min(50).max(5000).optional(),
  targetAudience: z.string().max(2000).optional().nullable(),
  expectedResults: z.string().min(50).max(5000).optional(),
  ministryRegion: z.string().max(200).optional().nullable(),
  ministryArea: z.string().max(100).optional().nullable(),
  budgetTotal: z.number().positive().optional(),
  parcelas: z.number().int().min(1).max(12).optional(),
  extendedData: z.record(z.unknown()).optional(),
});

export const updateDraftProject = submissorAction
  .schema(updateDraftSchema)
  .action(async ({ parsedInput, ctx }) => {
    const project = await getProjectOrThrow(parsedInput.projectId);

    if (project.stage !== "rascunho") {
      throw new Error(
        "Apenas projetos em rascunho podem ser editados. Solicite nova revisão se necessário.",
      );
    }

    // Only the submitter or super_admin can edit their own draft
    const isSuperAdmin = ctx.roles.includes("super_admin");
    if (!isSuperAdmin && project.submitterId !== ctx.actorId) {
      throw new Error("Apenas o submissor pode editar o próprio rascunho");
    }

    const patch: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsedInput.title !== undefined) patch.title = parsedInput.title;
    if (parsedInput.objectives !== undefined)
      patch.objectives = parsedInput.objectives;
    if (parsedInput.justification !== undefined)
      patch.justification = parsedInput.justification;
    if (parsedInput.targetAudience !== undefined)
      patch.targetAudience = parsedInput.targetAudience ?? null;
    if (parsedInput.expectedResults !== undefined)
      patch.expectedResults = parsedInput.expectedResults;
    if (parsedInput.ministryRegion !== undefined)
      patch.ministryRegion = parsedInput.ministryRegion ?? null;
    if (parsedInput.ministryArea !== undefined)
      patch.ministryArea = parsedInput.ministryArea ?? null;
    if (parsedInput.budgetTotal !== undefined)
      patch.budgetTotal = parsedInput.budgetTotal.toString();
    if (parsedInput.parcelas !== undefined)
      patch.parcelas = parsedInput.parcelas;

    const updated = await db
      .update(projects)
      .set(patch)
      .where(eq(projects.id, parsedInput.projectId))
      .returning();

    const after = updated[0];
    if (!after) throw new Error("Falha ao atualizar projeto");

    // Update version snapshot with new data
    await createVersionSnapshot(
      parsedInput.projectId,
      "rascunho",
      {
        ...patch,
        extendedData: parsedInput.extendedData,
        _source: "updateDraftProject",
      },
      ctx.actorId,
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.updated",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: computeDiff(
        project as Record<string, unknown>,
        after as Record<string, unknown>,
      ),
    });

    return { project: after };
  });

// ---------------------------------------------------------------------------
// submitProject — rascunho → validacao
// Checks budget, transitions stage, runs AI scoring + compact version
// ---------------------------------------------------------------------------

export const submitProject = submissorAction
  .schema(z.object({ projectId: z.string().uuid("Projeto inválido") }))
  .action(async ({ parsedInput, ctx }) => {
    const project = await getProjectOrThrow(parsedInput.projectId);

    if (project.stage !== "rascunho") {
      throw new Error("Apenas rascunhos podem ser submetidos");
    }
    if (
      project.submitterId !== ctx.actorId &&
      !ctx.roles.includes("super_admin")
    ) {
      throw new Error("Apenas o submissor pode submeter o próprio projeto");
    }

    // Guard: required fields
    if (!project.title || !project.organizationId) {
      throw new Error(
        "Preencha todos os campos obrigatórios antes de submeter",
      );
    }

    // Budget check
    if (
      project.budgetTotal &&
      project.organizationId &&
      project.evaluationYear
    ) {
      await checkOrganizationBudget(
        project.organizationId,
        project.evaluationYear,
        parseFloat(project.budgetTotal),
      );
    }

    const now = new Date();

    // Transition to validacao
    const updated = await db
      .update(projects)
      .set({ stage: "validacao", submittedAt: now, updatedAt: now })
      .where(eq(projects.id, parsedInput.projectId))
      .returning();

    const submittedProject = updated[0];
    if (!submittedProject) throw new Error("Falha ao submeter projeto");

    // Version snapshot
    await createVersionSnapshot(
      parsedInput.projectId,
      "validacao",
      {
        ...submittedProject,
        _source: "submitProject",
        submittedAt: now.toISOString(),
      },
      ctx.actorId,
    );

    // Load org name for AI context
    let orgName: string | null = null;
    if (project.organizationId) {
      const orgRows = await db
        .select({ nome: organizations.nome })
        .from(organizations)
        .where(eq(organizations.id, project.organizationId))
        .limit(1);
      orgName = orgRows[0]?.nome ?? null;
    }

    const scoringInput: ProjectScoringInput = {
      title: project.title,
      tipo: project.tipo,
      objectives: project.objectives,
      justification: project.justification,
      targetAudience: project.targetAudience,
      expectedResults: project.expectedResults,
      ministryRegion: project.ministryRegion,
      ministryArea: project.ministryArea,
      budgetTotal: project.budgetTotal,
      parcelas: project.parcelas,
      meses: project.meses,
      evaluationYear: project.evaluationYear,
    };

    const compactInput: CompactVersionInput = {
      title: project.title,
      tipo: project.tipo,
      organizationName: orgName,
      objectives: project.objectives,
      justification: project.justification,
      targetAudience: project.targetAudience,
      expectedResults: project.expectedResults,
      ministryRegion: project.ministryRegion,
      ministryArea: project.ministryArea,
      budgetTotal: project.budgetTotal,
      parcelas: project.parcelas,
      evaluationYear: project.evaluationYear,
    };

    // Run AI scoring (non-blocking: failure logs but doesn't break submission)
    try {
      const criteria = await loadScoringCriteria();
      const scoring = await scoreProject(scoringInput, criteria);

      await db
        .update(projects)
        .set({
          scoreAi: scoring.score.toString(),
          scoreAiBreakdown: scoring.breakdown,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, parsedInput.projectId));
    } catch (err) {
      console.error("[projetos/submit] AI scoring failed:", err);
    }

    // Generate compact version (non-blocking)
    try {
      const template = await loadCompactTemplate();
      const compact = await generateCompactVersion(compactInput, template);

      await db.insert(compactVersions).values({
        projectId: parsedInput.projectId,
        content: compact.content,
        generatedBy: "gpt-4.1",
      });
    } catch (err) {
      console.error(
        "[projetos/submit] Compact version generation failed:",
        err,
      );
    }

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.submitted",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: {
        from: "rascunho",
        to: "validacao",
        submittedAt: now.toISOString(),
      },
    });

    // Cross-app: criar checklist de análise no módulo tarefas (stub, P-0.15).
    // Awaited (nunca fire-and-forget, G6.5) — a submissão do projeto já foi
    // commitada acima, então uma falha aqui é logada e não propagada.
    try {
      await onProjectSubmitted(parsedInput.projectId);
    } catch (err) {
      console.error("[projetos/submit] tarefas integration failed:", err);
    }

    return { project: submittedProject };
  });

// ---------------------------------------------------------------------------
// transitionProjectStage — diretor advances the state machine
// ---------------------------------------------------------------------------

const transitionStageSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  toStage: z.enum([
    "rascunho",
    "validacao",
    "votacao",
    "homologacao",
    "aprovado",
    "reprovado",
    "em_execucao",
    "concluido",
  ]),
  notes: z.string().max(1000).optional(),
});

export const transitionProjectStage = diretorAction
  .schema(transitionStageSchema)
  .action(async ({ parsedInput, ctx }) => {
    const project = await getProjectOrThrow(parsedInput.projectId);

    // Validate transition
    const validNext = VALID_STAGE_TRANSITIONS[project.stage as ProjectStage];
    if (!(validNext as string[]).includes(parsedInput.toStage)) {
      throw new Error(
        `Transição inválida: ${project.stage} → ${parsedInput.toStage}. ` +
          `Próximos estágios válidos: ${validNext.join(", ")}`,
      );
    }

    const now = new Date();
    const patch: Partial<typeof projects.$inferInsert> = {
      stage: parsedInput.toStage as ProjectStage,
      updatedAt: now,
    };

    // Timestamp fields per stage
    if (parsedInput.toStage === "aprovado") patch.approvedAt = now;
    if (parsedInput.toStage === "em_execucao") patch.startedAt = now;
    if (parsedInput.toStage === "concluido") patch.concludedAt = now;

    const updated = await db
      .update(projects)
      .set(patch)
      .where(eq(projects.id, parsedInput.projectId))
      .returning();

    const afterProject = updated[0];
    if (!afterProject) throw new Error("Falha ao transicionar estágio");

    // Version snapshot
    await createVersionSnapshot(
      parsedInput.projectId,
      parsedInput.toStage as ProjectStage,
      {
        ...afterProject,
        _source: "transitionProjectStage",
        notes: parsedInput.notes,
        transitionedAt: now.toISOString(),
        transitionedBy: ctx.actorId,
      },
      ctx.actorId,
    );

    // When approved: generate payment schedule + cross-app financeiro integration
    if (
      parsedInput.toStage === "aprovado" &&
      afterProject.parcelas &&
      afterProject.meses &&
      afterProject.budgetTotal
    ) {
      await generatePaymentSchedule(afterProject);

      // Cross-app: criar centro de custo no módulo financeiro
      onProjectApproved(parsedInput.projectId).catch((err) =>
        console.error("[projetos/approve] financeiro integration failed:", err),
      );
    }

    // When entering homologacao: notify submissor (7-day window)
    if (parsedInput.toStage === "homologacao") {
      await notifyHomologacao(
        parsedInput.projectId,
        afterProject.submitterId,
        afterProject.title,
      );
    }

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.stage_transition",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: {
        from: project.stage,
        to: parsedInput.toStage,
        notes: parsedInput.notes,
        transitionedAt: now.toISOString(),
      },
    });

    return { project: afterProject };
  });

// ---------------------------------------------------------------------------
// createContestation — max 2 per project, 1 per person; returns to votacao
// ---------------------------------------------------------------------------

const contestationSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  justification: z
    .string()
    .min(30, "Descreva o motivo da contestação (mín. 30 caracteres)")
    .max(2000),
});

export const createContestation = projetosAction
  .schema(contestationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const project = await getProjectOrThrow(parsedInput.projectId);

    if (project.stage !== "homologacao") {
      throw new Error("Contestações só podem ser feitas durante a homologação");
    }

    // Check max 2 contestations per project
    const countResult = await db
      .select({ total: count() })
      .from(contestations)
      .where(eq(contestations.projectId, parsedInput.projectId));

    if ((countResult[0]?.total ?? 0) >= 2) {
      throw new Error("Limite de 2 contestações por projeto atingido");
    }

    // Insert — unique constraint (project_id, user_id) blocks double contestation
    const inserted = await db
      .insert(contestations)
      .values({
        projectId: parsedInput.projectId,
        userId: ctx.actorId,
        justification: parsedInput.justification,
        status: "pending",
      })
      .returning();

    const contestation = inserted[0];
    if (!contestation) throw new Error("Falha ao registrar contestação");

    // Return project to votacao
    const now = new Date();
    await db
      .update(projects)
      .set({ stage: "votacao", updatedAt: now })
      .where(eq(projects.id, parsedInput.projectId));

    await createVersionSnapshot(
      parsedInput.projectId,
      "votacao",
      {
        _source: "createContestation",
        contestationId: contestation.id,
        returnedBy: ctx.actorId,
        reason: parsedInput.justification,
        returnedAt: now.toISOString(),
      },
      ctx.actorId,
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "contestation.created",
      entity: "contestation",
      entityId: contestation.id,
      diff: {
        projectId: parsedInput.projectId,
        stageReverted: { from: "homologacao", to: "votacao" },
      },
    });

    return { contestation, stageReverted: "votacao" };
  });

// ---------------------------------------------------------------------------
// deleteProject — soft-delete with mandatory justification
// ---------------------------------------------------------------------------

export const deleteProject = projetosAction
  .schema(deleteProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const project = await getProjectOrThrow(parsedInput.projectId);

    // Permission: own project (any stage rascunho/validacao), OR diretor/super_admin
    const isSuperAdmin = ctx.roles.includes("super_admin");
    const isDiretor = ctx.roles.includes("diretor");
    const isSubmitter = project.submitterId === ctx.actorId;

    if (!isSuperAdmin && !isDiretor && !isSubmitter) {
      throw new Error(
        "Apenas o submissor ou a diretoria podem excluir projetos",
      );
    }

    // Submissors can only delete their own drafts
    if (
      !isSuperAdmin &&
      !isDiretor &&
      isSubmitter &&
      project.stage !== "rascunho"
    ) {
      throw new Error(
        "Submissores só podem excluir projetos em rascunho. Contate a diretoria para outros estágios.",
      );
    }

    const now = new Date();

    await db
      .update(projects)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(projects.id, parsedInput.projectId));

    // Record deletion in version snapshot
    await createVersionSnapshot(
      parsedInput.projectId,
      project.stage as ProjectStage,
      {
        _source: "deleteProject",
        deletedBy: ctx.actorId,
        deletedAt: now.toISOString(),
        reason: parsedInput.reason,
      },
      ctx.actorId,
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.deleted",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: {
        deletedAt: now.toISOString(),
        deletedBy: ctx.actorId,
        reason: parsedInput.reason,
        stageAtDeletion: project.stage,
      },
    });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Side-effect helpers
// ---------------------------------------------------------------------------
// generatePaymentSchedule / onProjectApproved movidos para
// @hebron/db/projetos-approval (P-0.14) — reusados pelo cron de homologação
// automática em packages/jobs, que não tem sessão HTTP para chamar esta
// Server Action.

async function notifyHomologacao(
  projectId: string,
  submitterId: string,
  projectTitle: string,
): Promise<void> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  await db.insert(notifications).values({
    userId: submitterId,
    channel: "in_app",
    type: "project.homologacao",
    title: "Projeto em homologação",
    body:
      `Seu projeto "${projectTitle}" entrou em período de homologação. ` +
      `Contestações podem ser feitas até ${sevenDaysFromNow.toLocaleDateString("pt-BR")}. ` +
      `Após 7 dias sem contestação, o projeto será automaticamente aprovado.`,
    payload: { projectId, homologacaoDeadline: sevenDaysFromNow.toISOString() },
  });
}
