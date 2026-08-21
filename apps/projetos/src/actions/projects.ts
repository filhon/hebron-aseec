"use server";

import { z } from "zod";
import {
  eq,
  and,
  isNull,
  isNotNull,
  ne,
  gte,
  count,
  desc,
  inArray,
  sql,
  cosineDistance,
} from "drizzle-orm";
import { db } from "@hebron/db/client";
import { BusinessError } from "@hebron/auth/safe-action-error";
import { enforceRateLimit, getRateLimiter } from "@hebron/auth/rate-limit";
import {
  withAuthenticatedContext,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import {
  projects,
  projectVersions,
  projectCategories,
  compactVersions,
  contestations,
  projectAttachments,
  notifications,
  organizations,
  systemSettings,
} from "@hebron/db/schema";
import { VALID_STAGE_TRANSITIONS } from "@hebron/db/schema";
import type {
  ProjectStage,
  DuplicateCandidateSnapshot,
} from "@hebron/db/schema";
import {
  createAnnualProjectSchema,
  createPunctualProjectSchema,
  createContestationSchema,
  deleteProjectSchema,
  checkMesesPagamentoCoherence,
} from "@hebron/validators/projetos";
import {
  scoreProject,
  DEFAULT_SCORING_CRITERIA,
} from "@hebron/ai/projects/scoring";
import {
  generateCompactVersion,
  DEFAULT_COMPACT_TEMPLATE,
} from "@hebron/ai/projects/compact-version";
import {
  generateProjectEmbedding,
  DEFAULT_DUPLICATE_THRESHOLD,
} from "@hebron/ai/projects/duplicate-detection";
import { PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY } from "@hebron/db/seed";
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
  notifyProjectApprovalFailure,
} from "@hebron/db/projetos-approval";
import { onProjectSubmitted } from "@hebron/integrations/projetos-tarefas";
import { checkOrganizationBudget } from "@hebron/integrations/projetos";
import {
  notifyProjectSubmitted,
  notifyProjectInValidation,
  notifyVotingOpen,
  notifyContestation,
} from "../lib/notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getProjectOrThrow(tx: AuthenticatedTx, projectId: string) {
  const rows = await tx
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  const project = rows[0];
  if (!project) throw new BusinessError("Projeto não encontrado");
  return project;
}

async function getNextVersionNumber(
  tx: AuthenticatedTx,
  projectId: string,
): Promise<number> {
  const result = await tx
    .select({ total: count() })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));

  return (result[0]?.total ?? 0) + 1;
}

async function createVersionSnapshot(
  tx: AuthenticatedTx,
  projectId: string,
  stage: ProjectStage,
  data: Record<string, unknown>,
  createdBy: string,
): Promise<void> {
  const versionNumber = await getNextVersionNumber(tx, projectId);
  await tx.insert(projectVersions).values({
    projectId,
    versionNumber,
    stage,
    data,
    createdBy,
  });
}

async function lookupCategoryId(
  tx: AuthenticatedTx,
  slug: string,
): Promise<string | null> {
  const { projectCategories } = await import("@hebron/db/schema");
  const rows = await tx
    .select({ id: projectCategories.id })
    .from(projectCategories)
    .where(eq(projectCategories.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function loadScoringCriteria(
  tx: AuthenticatedTx,
): Promise<ScoringCriteria> {
  const rows = await tx
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "projetos_scoring_criteria"))
    .limit(1);

  if (!rows[0]) return DEFAULT_SCORING_CRITERIA;
  return (rows[0].value as ScoringCriteria | null) ?? DEFAULT_SCORING_CRITERIA;
}

async function loadCompactTemplate(
  tx: AuthenticatedTx,
): Promise<CompactVersionTemplate> {
  const rows = await tx
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "projetos_compact_template"))
    .limit(1);

  if (!rows[0]) return DEFAULT_COMPACT_TEMPLATE;
  return (
    (rows[0].value as CompactVersionTemplate | null) ?? DEFAULT_COMPACT_TEMPLATE
  );
}

async function loadDuplicateThreshold(tx: AuthenticatedTx): Promise<number> {
  const rows = await tx
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY))
    .limit(1);

  const value = rows[0]?.value;
  return typeof value === "number" ? value : DEFAULT_DUPLICATE_THRESHOLD;
}

// ---------------------------------------------------------------------------
// findRenewalCandidate — detecta um projeto anual anterior da mesma
// organização em estágio final, para o wizard oferecer como base ao
// submissor (P-2.13, BRAIN §6.2 "Renovação/continuação: nova entrada
// vinculada via parent_project_id"). Só informa o candidato — nunca grava
// vínculo; o vínculo é sempre opt-in ("Usar como base" no wizard).
// ---------------------------------------------------------------------------

const RENEWAL_CANDIDATE_STAGES: ProjectStage[] = [
  "concluido",
  "aprovado",
  "em_execucao",
];

export type RenewalCandidatePrefill = {
  titulo: string;
  categoria: string;
  objetivos: string;
  justificativa: string;
  metodologia: string;
  contextoMinisterial: string;
  tempoMinisterioAnos: string;
  regiao: string;
  pais: string;
  beneficiariosQuantidade: string;
  beneficiariosDescricao: string;
  resultadosEsperados: string;
  valorTotal: string;
  numeroParcelas: string;
  cofinancimento: string;
  anoReferencia: string;
  mesesSelecionados: number[];
};

export type RenewalCandidate = {
  id: string;
  titulo: string;
  ano: number | null;
  categoriaSlug: string | null;
  prefill: RenewalCandidatePrefill;
};

export const findRenewalCandidate = submissorAction
  .schema(z.object({ organizationId: z.string().uuid("Instituição inválida") }))
  .action(async ({ parsedInput, ctx }) => {
    const candidate = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx): Promise<RenewalCandidate | null> => {
        const rows = await tx
          .select({
            id: projects.id,
            title: projects.title,
            objectives: projects.objectives,
            justification: projects.justification,
            expectedResults: projects.expectedResults,
            ministryRegion: projects.ministryRegion,
            ministryArea: projects.ministryArea,
            budgetTotal: projects.budgetTotal,
            parcelas: projects.parcelas,
            evaluationYear: projects.evaluationYear,
            categorySlug: projectCategories.slug,
          })
          .from(projects)
          .leftJoin(
            projectCategories,
            eq(projects.categoryId, projectCategories.id),
          )
          .where(
            and(
              eq(projects.organizationId, parsedInput.organizationId),
              eq(projects.tipo, "anual"),
              inArray(projects.stage, RENEWAL_CANDIDATE_STAGES),
              isNull(projects.deletedAt),
            ),
          )
          .orderBy(desc(projects.createdAt))
          .limit(1);

        const project = rows[0];
        if (!project) return null;

        // Campos sem coluna própria (metodologia, contexto ministerial,
        // tempo de ministério, beneficiários, cofinanciamento, meses de
        // pagamento) só existem no snapshot da versão 1 — mesmo padrão de
        // getSubmissorProjectDetail/getDirectorProjectDetail (lib/queries.ts).
        // RLS "project_versions_select" só libera o próprio submissor (mais
        // estrito que "projects_select_own_or_org"): se o candidato foi
        // submetido por outro membro da organização, esta consulta volta
        // vazia e o pré-preenchimento cai só nos campos que já vêm de
        // `projects` — nunca falha, só fica parcial.
        const versionRows = await tx
          .select({ data: projectVersions.data })
          .from(projectVersions)
          .where(eq(projectVersions.projectId, project.id))
          .orderBy(projectVersions.versionNumber)
          .limit(1);

        const snapshot = (versionRows[0]?.data ?? {}) as Record<
          string,
          unknown
        >;

        const mesesSelecionados = Array.isArray(snapshot.mesesPagamento)
          ? (snapshot.mesesPagamento as number[])
          : [];

        return {
          id: project.id,
          titulo: project.title,
          ano: project.evaluationYear,
          categoriaSlug: project.categorySlug,
          prefill: {
            titulo: project.title,
            categoria: project.categorySlug ?? "",
            objetivos: project.objectives ?? "",
            justificativa: project.justification ?? "",
            metodologia:
              typeof snapshot.metodologia === "string"
                ? snapshot.metodologia
                : "",
            contextoMinisterial:
              typeof snapshot.contextoMinisterial === "string"
                ? snapshot.contextoMinisterial
                : "",
            tempoMinisterioAnos:
              typeof snapshot.tempoMinisterioAnos === "number"
                ? String(snapshot.tempoMinisterioAnos)
                : "",
            regiao: project.ministryRegion ?? "",
            pais: project.ministryArea ?? "",
            beneficiariosQuantidade:
              typeof snapshot.beneficiariosQuantidade === "number"
                ? String(snapshot.beneficiariosQuantidade)
                : "",
            beneficiariosDescricao:
              typeof snapshot.beneficiariosDescricao === "string"
                ? snapshot.beneficiariosDescricao
                : "",
            resultadosEsperados: project.expectedResults ?? "",
            valorTotal: project.budgetTotal ?? "",
            numeroParcelas:
              project.parcelas !== null ? String(project.parcelas) : "",
            cofinancimento:
              typeof snapshot.cofinancimento === "string"
                ? snapshot.cofinancimento
                : "",
            anoReferencia:
              project.evaluationYear !== null
                ? String(project.evaluationYear)
                : "",
            mesesSelecionados,
          },
        };
      },
    );

    return { candidate };
  });

// ---------------------------------------------------------------------------
// createAnnualDraft — submissor creates an annual project draft
// ---------------------------------------------------------------------------

export const createAnnualDraft = submissorAction
  .schema(createAnnualProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const year = parsedInput.anoReferencia;

    const project = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const categoryId = await lookupCategoryId(tx, parsedInput.categoria);

        const inserted = await tx
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
        if (!project) throw new BusinessError("Falha ao criar projeto");

        // Store full form data (including fields without DB columns) in version 1
        await createVersionSnapshot(
          tx,
          project.id,
          "rascunho",
          { ...parsedInput, _source: "createAnnualDraft" },
          ctx.actorId,
        );

        if (parsedInput.attachments?.length) {
          await tx.insert(projectAttachments).values(
            parsedInput.attachments.map((a) => ({
              projectId: project.id,
              fileUrl: a.fileUrl,
              fileName: a.fileName,
              fileSize: a.fileSize ?? null,
              uploadedBy: ctx.actorId,
            })),
          );
        }

        return project;
      },
    );

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
    const year = new Date().getFullYear();

    const project = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const categoryId = await lookupCategoryId(tx, parsedInput.categoria);

        const inserted = await tx
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
        if (!project) throw new BusinessError("Falha ao criar projeto pontual");

        await createVersionSnapshot(
          tx,
          project.id,
          "rascunho",
          { ...parsedInput, _source: "createPunctualDraft" },
          ctx.actorId,
        );

        if (parsedInput.attachments?.length) {
          await tx.insert(projectAttachments).values(
            parsedInput.attachments.map((a) => ({
              projectId: project.id,
              fileUrl: a.fileUrl,
              fileName: a.fileName,
              fileSize: a.fileSize ?? null,
              uploadedBy: ctx.actorId,
            })),
          );
        }

        return project;
      },
    );

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

// `parcelas` e `mesesPagamento` só podem mudar juntos: a mesma
// checkMesesPagamentoCoherence usada em createAnnualProjectSchema (P-2.4b),
// não uma segunda cópia da regra. Sem isso, um update que altere só
// `parcelas` desfaz a igualdade parcelas===meses mantida desde a criação,
// e generatePaymentSchedule (packages/db/projetos-approval.ts) divide o
// orçamento por `parcelas` mas emite uma linha por `meses` — a causa raiz
// do defeito registrado em P-2.8c.
const updateDraftSchema = z
  .object({
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
    mesesPagamento: z
      .array(z.number().int().min(1).max(12))
      .min(1, "Selecione pelo menos um mês de pagamento")
      .optional(),
    extendedData: z.record(z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const { parcelas, mesesPagamento } = data;
    if ((parcelas === undefined) !== (mesesPagamento === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [parcelas === undefined ? "parcelas" : "mesesPagamento"],
        message:
          "Parcelas e meses de pagamento devem ser alterados juntos — informe os dois.",
      });
      return;
    }
    if (parcelas !== undefined && mesesPagamento !== undefined) {
      checkMesesPagamentoCoherence(mesesPagamento, parcelas, ctx);
    }
  });

export const updateDraftProject = submissorAction
  .schema(updateDraftSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { before, after } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const project = await getProjectOrThrow(tx, parsedInput.projectId);

        if (project.stage !== "rascunho") {
          throw new BusinessError(
            "Apenas projetos em rascunho podem ser editados. Solicite nova revisão se necessário.",
          );
        }

        // Only the submitter or super_admin can edit their own draft
        const isSuperAdmin = ctx.roles.includes("super_admin");
        if (!isSuperAdmin && project.submitterId !== ctx.actorId) {
          throw new BusinessError(
            "Apenas o submissor pode editar o próprio rascunho",
          );
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
        // meses acompanha mesesPagamento.length — nunca gravado sozinho,
        // mesma invariante de createAnnualDraft (meses === parcelas).
        if (parsedInput.mesesPagamento !== undefined)
          patch.meses = parsedInput.mesesPagamento.length;

        const updated = await tx
          .update(projects)
          .set(patch)
          .where(eq(projects.id, parsedInput.projectId))
          .returning();

        const after = updated[0];
        if (!after) throw new BusinessError("Falha ao atualizar projeto");

        // Update version snapshot with new data
        await createVersionSnapshot(
          tx,
          parsedInput.projectId,
          "rascunho",
          {
            ...patch,
            extendedData: parsedInput.extendedData,
            _source: "updateDraftProject",
          },
          ctx.actorId,
        );

        return { before: project, after };
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.updated",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: computeDiff(
        before as Record<string, unknown>,
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
    // PACOTE 5: submissão dispara scoring de IA (custo) + notificações —
    // limite generoso por ator, só para conter um script em loop.
    await enforceRateLimit(
      getRateLimiter("submit-project", 10, 3600),
      `actor:${ctx.actorId}`,
    );

    const project = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) => getProjectOrThrow(tx, parsedInput.projectId),
    );

    if (project.stage !== "rascunho") {
      throw new BusinessError("Apenas rascunhos podem ser submetidos");
    }
    if (
      project.submitterId !== ctx.actorId &&
      !ctx.roles.includes("super_admin")
    ) {
      throw new BusinessError(
        "Apenas o submissor pode submeter o próprio projeto",
      );
    }

    // Guard: required fields
    if (!project.title || !project.organizationId) {
      throw new BusinessError(
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

    const { submittedProject, orgName } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        // Transition to validacao
        const updated = await tx
          .update(projects)
          .set({ stage: "validacao", submittedAt: now, updatedAt: now })
          .where(eq(projects.id, parsedInput.projectId))
          .returning();

        const submittedProject = updated[0];
        if (!submittedProject)
          throw new BusinessError("Falha ao submeter projeto");

        // Version snapshot
        await createVersionSnapshot(
          tx,
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
          const orgRows = await tx
            .select({ nome: organizations.nome })
            .from(organizations)
            .where(eq(organizations.id, project.organizationId))
            .limit(1);
          orgName = orgRows[0]?.nome ?? null;
        }

        return { submittedProject, orgName };
      },
    );

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
      const criteria = await withAuthenticatedContext(
        { actorId: ctx.actorId },
        (tx) => loadScoringCriteria(tx),
      );
      const scoring = await scoreProject(scoringInput, criteria);

      await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
        tx
          .update(projects)
          .set({
            scoreAi: scoring.score.toString(),
            scoreAiBreakdown: scoring.breakdown,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, parsedInput.projectId)),
      );
    } catch (err) {
      console.error("[projetos/submit] AI scoring failed:", err);
    }

    // Duplicate detection via embeddings (P-2.14, non-blocking): gera o
    // embedding do texto livre e compara por similaridade de cosseno contra
    // projetos JÁ submetidos de QUALQUER organização — duplicidade é sobre o
    // conteúdo da proposta, não sobre quem propõe (BRAIN §6.2). O resultado
    // é um snapshot gravado agora com o limiar vigente; nunca recalculado
    // retroativamente se o limiar mudar depois. Falha de IA nunca impede a
    // submissão, mesmo padrão do bloco de scoring acima.
    try {
      const embedding = await generateProjectEmbedding({
        title: project.title,
        objectives: project.objectives,
        justification: project.justification,
      });

      await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
        const threshold = await loadDuplicateThreshold(tx);
        const similarity = sql<number>`1 - (${cosineDistance(projects.embedding, embedding)})`;

        const candidateRows = await tx
          .select({
            id: projects.id,
            title: projects.title,
            orgNome: organizations.nome,
            similarity,
          })
          .from(projects)
          .leftJoin(
            organizations,
            eq(projects.organizationId, organizations.id),
          )
          .where(
            and(
              isNotNull(projects.embedding),
              isNull(projects.deletedAt),
              ne(projects.id, parsedInput.projectId),
              gte(similarity, threshold),
            ),
          )
          .orderBy(desc(similarity))
          .limit(5);

        const duplicateCandidates: DuplicateCandidateSnapshot[] =
          candidateRows.map((c) => ({
            projectId: c.id,
            title: c.title,
            orgName: c.orgNome ?? "Instituição",
            similarity: Number(c.similarity),
          }));

        await tx
          .update(projects)
          .set({
            embedding,
            possibleDuplicate: duplicateCandidates.length > 0,
            duplicateCandidates,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, parsedInput.projectId));
      });
    } catch (err) {
      console.error("[projetos/submit] Duplicate detection failed:", err);
    }

    // Generate compact version (non-blocking)
    try {
      const template = await withAuthenticatedContext(
        { actorId: ctx.actorId },
        (tx) => loadCompactTemplate(tx),
      );
      const compact = await generateCompactVersion(compactInput, template);

      await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
        tx.insert(compactVersions).values({
          projectId: parsedInput.projectId,
          content: compact.content,
          generatedBy: "gpt-4.1",
        }),
      );
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

    // Cross-app: criar checklist de análise no módulo tarefas (real,
    // packages/integrations/src/projetos-tarefas.ts, P-4.11). Awaited (nunca
    // fire-and-forget, G6.5) — a submissão do projeto já foi commitada
    // acima, então a falha é decidida aqui: não propagamos para o
    // submissor (a submissão já aconteceu), só logamos. A função chamada já
    // loga estruturado e notifica todo super_admin antes de relançar —
    // este catch é a segunda camada, para o caso raro de ela mesma falhar.
    try {
      await onProjectSubmitted(parsedInput.projectId);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "cross_app_integration_failure",
          integration: "projetos-tarefas.onProjectSubmitted",
          caller: "projetos/actions/projects.ts::submitProject",
          projectId: parsedInput.projectId,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    // Notificações (P-2.10b) — best-effort: a submissão já foi commitada
    // acima, uma falha de email/in_app não deve reverter nem propagar erro
    // ao submissor.
    try {
      await notifyProjectSubmitted(parsedInput.projectId);
    } catch (err) {
      console.error("[projetos/submit] notifyProjectSubmitted failed:", err);
    }
    try {
      await notifyProjectInValidation(parsedInput.projectId);
    } catch (err) {
      console.error("[projetos/submit] notifyProjectInValidation failed:", err);
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
    const { fromStage, afterProject } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const project = await getProjectOrThrow(tx, parsedInput.projectId);

        // Validate transition
        const validNext =
          VALID_STAGE_TRANSITIONS[project.stage as ProjectStage];
        if (!(validNext as string[]).includes(parsedInput.toStage)) {
          throw new BusinessError(
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

        const updated = await tx
          .update(projects)
          .set(patch)
          .where(eq(projects.id, parsedInput.projectId))
          .returning();

        const afterProject = updated[0];
        if (!afterProject)
          throw new BusinessError("Falha ao transicionar estágio");

        // Version snapshot
        await createVersionSnapshot(
          tx,
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

        return { fromStage: project.stage, afterProject };
      },
    );

    // When approved: generate payment schedule + cross-app financeiro integration
    if (
      parsedInput.toStage === "aprovado" &&
      afterProject.parcelas &&
      afterProject.meses &&
      afterProject.budgetTotal
    ) {
      await generatePaymentSchedule(afterProject);

      // Cross-app: criar centro de custo no módulo financeiro. Aguardada
      // (nunca fire-and-forget, BRAIN.md:559-563) — a transição de estágio
      // já foi commitada acima e não é revertida por esta falha, mas o
      // super_admin precisa ser avisado: projeto aprovado sem payables
      // exige intervenção humana (PACOTE 2 / FLX-001).
      try {
        await onProjectApproved(parsedInput.projectId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          JSON.stringify({
            event: "cross_app_integration_failure",
            integration: "financeiro.onProjectApproved",
            caller: "projetos/actions/projects.ts::transitionProjectStage",
            projectId: parsedInput.projectId,
            message,
          }),
        );
        await notifyProjectApprovalFailure(parsedInput.projectId, message);
      }
    }

    // When entering homologacao: notify submissor (7-day window)
    if (parsedInput.toStage === "homologacao") {
      await notifyHomologacao(
        parsedInput.projectId,
        afterProject.submitterId,
        afterProject.title,
      );
    }

    // When entering votacao: notify diretores + conselheiros (P-2.10b) —
    // best-effort, a transição de estágio já foi commitada acima.
    if (parsedInput.toStage === "votacao") {
      try {
        await notifyVotingOpen(parsedInput.projectId);
      } catch (err) {
        console.error("[projetos/transition] notifyVotingOpen failed:", err);
      }
    }

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.stage_transition",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: {
        from: fromStage,
        to: parsedInput.toStage,
        notes: parsedInput.notes,
        transitionedAt: afterProject.updatedAt.toISOString(),
      },
    });

    return { project: afterProject };
  });

// ---------------------------------------------------------------------------
// createContestation — max 2 per project, 1 per person; returns to votacao
// ---------------------------------------------------------------------------

export const createContestation = projetosAction
  .schema(createContestationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const contestation = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const project = await getProjectOrThrow(tx, parsedInput.projectId);

        if (project.stage !== "homologacao") {
          throw new BusinessError(
            "Contestações só podem ser feitas durante a homologação",
          );
        }

        // Check max 2 contestations per project
        const countResult = await tx
          .select({ total: count() })
          .from(contestations)
          .where(eq(contestations.projectId, parsedInput.projectId));

        if ((countResult[0]?.total ?? 0) >= 2) {
          throw new BusinessError(
            "Limite de 2 contestações por projeto atingido",
          );
        }

        // Insert — unique constraint (project_id, user_id) blocks double contestation
        const inserted = await tx
          .insert(contestations)
          .values({
            projectId: parsedInput.projectId,
            userId: ctx.actorId,
            justification: parsedInput.reason,
            status: "pending",
          })
          .returning();

        const contestation = inserted[0];
        if (!contestation)
          throw new BusinessError("Falha ao registrar contestação");

        // Return project to votacao
        const now = new Date();
        await tx
          .update(projects)
          .set({ stage: "votacao", updatedAt: now })
          .where(eq(projects.id, parsedInput.projectId));

        await createVersionSnapshot(
          tx,
          parsedInput.projectId,
          "votacao",
          {
            _source: "createContestation",
            contestationId: contestation.id,
            returnedBy: ctx.actorId,
            reason: parsedInput.reason,
            returnedAt: now.toISOString(),
          },
          ctx.actorId,
        );

        return contestation;
      },
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

    // Notificação (P-2.10b) — best-effort: a contestação já foi commitada
    // acima. Só notifica "contestação registrada" (não também
    // notifyVotingOpen) — o corpo do email já informa que o projeto volta
    // para votação; um segundo email duplicaria o aviso para o mesmo
    // evento (decisão registrada em SESSIONS.md).
    try {
      await notifyContestation(parsedInput.projectId, ctx.actorId);
    } catch (err) {
      console.error("[projetos/contestation] notifyContestation failed:", err);
    }

    return { contestation, stageReverted: "votacao" };
  });

// ---------------------------------------------------------------------------
// deleteProject — soft-delete with mandatory justification
// ---------------------------------------------------------------------------

export const deleteProject = projetosAction
  .schema(deleteProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const stageAtDeletion = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const project = await getProjectOrThrow(tx, parsedInput.projectId);

        // Permission: own project (any stage rascunho/validacao), OR diretor/super_admin
        const isSuperAdmin = ctx.roles.includes("super_admin");
        const isDiretor = ctx.roles.includes("diretor");
        const isSubmitter = project.submitterId === ctx.actorId;

        if (!isSuperAdmin && !isDiretor && !isSubmitter) {
          throw new BusinessError(
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
          throw new BusinessError(
            "Submissores só podem excluir projetos em rascunho. Contate a diretoria para outros estágios.",
          );
        }

        const now = new Date();

        await tx
          .update(projects)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(projects.id, parsedInput.projectId));

        // Record deletion in version snapshot
        await createVersionSnapshot(
          tx,
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

        return project.stage;
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.deleted",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: {
        deletedBy: ctx.actorId,
        reason: parsedInput.reason,
        stageAtDeletion,
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

  // Exceção service-level (G6.3): "notifications_insert_service"
  // (0014_grants_authenticated.sql) só concede INSERT a service_role —
  // authenticated não tem GRANT nenhum na tabela. db (superuser) é o único
  // caminho possível aqui, mesmo padrão já usado em admin/actions/users.ts
  // e financeiro/actions/approval.ts pelo mesmo motivo.
  await db.insert(notifications).values({
    userId: submitterId,
    channel: "in_app",
    type: "project.homologacao",
    title: "Projeto em homologação",
    body:
      `Seu projeto "${projectTitle}" entrou em período de homologação. ` +
      `Contestações podem ser feitas até ${sevenDaysFromNow.toLocaleDateString("pt-BR")}. ` +
      `Após 7 dias sem contestação, o projeto será automaticamente aprovado.`,
    payload: {
      module: "projetos",
      projectId,
      homologacaoDeadline: sevenDaysFromNow.toISOString(),
      // Rota do submissor — (submissor)/[id], não /projetos/<id> (P-2.10b).
      href: `/${projectId}`,
    },
  });
}
