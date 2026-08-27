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
  withSystemRole,
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
  registerProjectDecisionSchema,
  updateProjectFieldsSchema,
} from "@hebron/validators/projetos";
import type { UpdateProjectFieldsInput } from "@hebron/validators/projetos";
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
  conselheiroDiretorAction,
  projetosAction,
  superAdminAction,
} from "../lib/safe-action";
import { logProjectAudit, computeDiff } from "../lib/audit";
import {
  generatePaymentSchedule,
  onProjectApproved,
} from "@hebron/db/projetos-approval";
import { onProjectSubmitted } from "@hebron/integrations/projetos-tarefas";
import { checkOrganizationBudget } from "@hebron/integrations/projetos";
import {
  notifyProjectSubmitted,
  notifyProjectInValidation,
  notifyVotingOpen,
  notifyContestation,
  notifyProjectUpdated,
  type ProjectFieldChangeRaw,
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
            mesesPagamento: projects.mesesPagamento,
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
        // tempo de ministério, beneficiários, cofinanciamento) só existem no
        // snapshot da versão 1 — mesmo padrão de
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

        // Meses de pagamento saíram da lista acima em P-2.6c: têm coluna
        // própria (`meses_pagamento`), que vem de `projects` e portanto
        // sobrevive à RLS mais estrita de project_versions — é justamente o
        // caso de renovação por outro membro da organização. O snapshot fica
        // como fallback para candidato anterior à migration 0091.
        const mesesSelecionados =
          project.mesesPagamento && project.mesesPagamento.length > 0
            ? project.mesesPagamento
            : Array.isArray(snapshot.mesesPagamento)
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
            // A lista, não só a contagem — é ela que define o vencimento de
            // cada parcela em generatePaymentSchedule (P-2.6c). Gravada em
            // ordem crescente para que a coluna seja canônica.
            mesesPagamento: [...parsedInput.mesesPagamento].sort(
              (a, b) => a - b,
            ),
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
// updateProjectInValidation — super_admin edits a project in validacao
// (P-2.16 CORRETIVO, AUDIT/06 §1.2/§1.3)
// ---------------------------------------------------------------------------

// Patch builder compartilhado pelas duas actions abaixo — nenhuma reimplementa
// o mapeamento campo a campo (updateProjectFieldsSchema, @hebron/validators).
function buildProjectFieldsPatch(
  parsedInput: UpdateProjectFieldsInput,
): Partial<typeof projects.$inferInsert> {
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
  if (parsedInput.parcelas !== undefined) patch.parcelas = parsedInput.parcelas;
  // meses acompanha mesesPagamento.length — nunca gravado sozinho, mesma
  // invariante de createAnnualDraft (meses === parcelas). Desde P-2.6c a
  // lista também é gravada (meses_pagamento), porque é ela que define o
  // vencimento de cada parcela no cronograma.
  if (parsedInput.mesesPagamento !== undefined) {
    patch.meses = parsedInput.mesesPagamento.length;
    patch.mesesPagamento = [...parsedInput.mesesPagamento].sort(
      (a, b) => a - b,
    );
  }
  return patch;
}

// Campos rastreados para o email "o que mudou" ao submissor
// (notifyProjectUpdated) — só os que updateProjectFieldsSchema aceita, nunca
// `updatedAt` (ruído presente em todo patch).
const TRACKED_CHANGE_FIELDS = [
  "title",
  "objectives",
  "justification",
  "targetAudience",
  "expectedResults",
  "ministryRegion",
  "ministryArea",
  "budgetTotal",
  "parcelas",
  "mesesPagamento",
] as const;

function buildFieldChanges(
  before: typeof projects.$inferSelect,
  patch: Partial<typeof projects.$inferInsert>,
): ProjectFieldChangeRaw[] {
  const changes: ProjectFieldChangeRaw[] = [];
  for (const field of TRACKED_CHANGE_FIELDS) {
    if (!(field in patch)) continue;
    const beforeVal = before[field];
    const afterVal = (patch as Record<string, unknown>)[field];
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({ field, before: beforeVal, after: afterVal });
    }
  }
  return changes;
}

export const updateDraftProject = submissorAction
  .schema(updateProjectFieldsSchema)
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

        const patch = buildProjectFieldsPatch(parsedInput);

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

// AUDIT/06 §1.2/§1.3: em validação, a única action de escrita era
// updateDraftProject, que recusa qualquer stage diferente de "rascunho" — na
// prática, "editar em validação" só sabia mudar o nome do projeto no banco
// (nada realmente editável chegava lá). Q23/Q38: só super_admin altera um
// projeto em validação, e pode alterar qualquer campo (mesmo conjunto de
// updateDraftProject, reusando o patch builder acima). Cada alteração:
// (1) grava snapshot de versão, (2) audita com diff explícito, (3) notifica
// o submissor por email com a lista de campos alterados — PRD item 8.
export const updateProjectInValidation = superAdminAction
  .schema(updateProjectFieldsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { before, after, changes } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const project = await getProjectOrThrow(tx, parsedInput.projectId);

        if (project.stage !== "validacao") {
          throw new BusinessError(
            "Apenas projetos em validação podem ser editados por este painel.",
          );
        }

        const patch = buildProjectFieldsPatch(parsedInput);
        const changes = buildFieldChanges(project, patch);

        const updated = await tx
          .update(projects)
          .set(patch)
          .where(eq(projects.id, parsedInput.projectId))
          .returning();

        const after = updated[0];
        if (!after) throw new BusinessError("Falha ao atualizar projeto");

        await createVersionSnapshot(
          tx,
          parsedInput.projectId,
          "validacao",
          {
            ...patch,
            extendedData: parsedInput.extendedData,
            _source: "updateProjectInValidation",
          },
          ctx.actorId,
        );

        return { before: project, after, changes };
      },
    );

    await logProjectAudit({
      actorId: ctx.actorId,
      action: "project.updated_in_validation",
      entity: "project",
      entityId: parsedInput.projectId,
      diff: computeDiff(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      ),
    });

    // Notificação (PRD item 8) — best-effort: a alteração já foi commitada
    // acima, uma falha de email não deve propagar erro ao super_admin nem
    // reverter a escrita, mesmo padrão dos demais notify* deste arquivo.
    if (changes.length > 0) {
      try {
        await notifyProjectUpdated(parsedInput.projectId, changes);
      } catch (err) {
        console.error(
          "[projetos/update-validation] notifyProjectUpdated failed:",
          err,
        );
      }
    }

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
    const { afterProject } = await withAuthenticatedContext(
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

        // P-2.15 CORRETIVO: "→ aprovado" sem decisão registrada contornava o
        // painel de decisão em silêncio (arrasto no kanban, por exemplo) — o
        // sistema nunca aprendia o valor efetivamente aprovado, só o pedido.
        // registerProjectDecision (abaixo) é o único caminho para aprovar.
        if (
          parsedInput.toStage === "aprovado" &&
          project.approvedDecisionAt === null
        ) {
          throw new BusinessError(
            "A aprovação deve ser feita pelo painel de decisão, que registra o valor aprovado.",
          );
        }

        // P-2.16 CORRETIVO: votacao → validacao é topologicamente válida
        // (VALID_STAGE_TRANSITIONS) para permitir corrigir o valor pedido
        // antes da votação, mas só super_admin pode editar um projeto em
        // validação (Q23) — diretorAction (que também permite diretor) não
        // basta para este retorno específico.
        if (
          project.stage === "votacao" &&
          parsedInput.toStage === "validacao" &&
          !ctx.roles.includes("super_admin")
        ) {
          throw new BusinessError(
            "Apenas super_admin pode retornar o projeto para validação.",
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

        // P-0.14b — provisionamento financeiro DENTRO da mesma transação da
        // transição, para que a aprovação manual tenha a mesma garantia que a
        // automática (packages/jobs/src/crons/projetos.ts): ou o projeto fica
        // aprovado COM schedule, centro de custo e payables, ou não fica
        // aprovado. Antes isto rodava depois do commit e um erro deixava o
        // projeto aprovado sem nada disso.
        //
        // `withSystemRole` porque as escritas de destino não são abertas ao
        // papel `authenticated` desta sessão — `financeiro.payables` só aceita
        // INSERT de super_admin|colaborador (0010_financeiro.sql) e esta é uma
        // `diretorAction`; o audit_log só aceita `service_role`. Mesma
        // transação (atômico), privilégio equivalente ao do `db` module-level
        // que estas funções usavam antes.
        if (
          parsedInput.toStage === "aprovado" &&
          afterProject.parcelas &&
          afterProject.meses &&
          afterProject.budgetTotal
        ) {
          await withSystemRole(tx, async (sysTx) => {
            await generatePaymentSchedule(afterProject, sysTx);
            await onProjectApproved(parsedInput.projectId, sysTx);
          });
        }

        // Audit também na transação (governança, F3-Q4): uma transição sem
        // trilha durável não pode sobreviver ao commit.
        await withSystemRole(tx, (sysTx) =>
          logProjectAudit(
            {
              actorId: ctx.actorId,
              action: "project.stage_transition",
              entity: "project",
              entityId: parsedInput.projectId,
              diff: {
                from: project.stage,
                to: parsedInput.toStage,
                notes: parsedInput.notes,
                transitionedAt: afterProject.updatedAt.toISOString(),
              },
            },
            sysTx,
          ),
        );

        return { afterProject };
      },
    );

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

    return { project: afterProject };
  });

// ---------------------------------------------------------------------------
// registerProjectDecision — o painel de decisão da diretoria (P-2.15
// CORRETIVO). Único caminho para validacao/homologacao → aprovado: grava o
// valor EFETIVAMENTE aprovado (distinto do pedido em budgetTotal), podendo
// ser parcial e, no pontual, dividido em parcelas (Q9, Q54, BRAIN §6.2
// "Valor aprovado"). transitionProjectStage recusa "→ aprovado" sem essa
// decisão registrada.
//
// Gate: diretorAction — o mesmo de transitionProjectStage. A auditoria
// (AUDIT/06 §1.1) sugeriu restringir à designação "diretor gestor"; isso NÃO
// está no escopo deste corretivo — nenhuma resposta do Filipe determina isso
// para Projetos (a designação gestor governa Flats/Q123/payables). Registrado
// como dúvida aberta em SESSIONS.md, não implementado aqui.
// ---------------------------------------------------------------------------

export const registerProjectDecision = diretorAction
  .schema(registerProjectDecisionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { afterProject } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const project = await getProjectOrThrow(tx, parsedInput.projectId);

        const validNext =
          VALID_STAGE_TRANSITIONS[project.stage as ProjectStage];
        if (!(validNext as string[]).includes(parsedInput.decision)) {
          throw new BusinessError(
            `Transição inválida: ${project.stage} → ${parsedInput.decision}. ` +
              `Próximos estágios válidos: ${validNext.join(", ")}`,
          );
        }

        const now = new Date();
        const patch: Partial<typeof projects.$inferInsert> = {
          stage: parsedInput.decision as ProjectStage,
          updatedAt: now,
          approvedBy: ctx.actorId,
          approvedDecisionAt: now,
          approvedNotes: parsedInput.notes ?? null,
        };

        if (parsedInput.decision === "aprovado") {
          // Zod (registerProjectDecisionSchema) já exige approvedAmount > 0
          // quando decision é "aprovado" — checagem redundante aqui só
          // estreita o tipo sem non-null assertion.
          if (parsedInput.approvedAmount === undefined) {
            throw new BusinessError("Valor aprovado é obrigatório");
          }

          // Sem teto rígido em budget_total (Q7 prevê orçamento aumentado),
          // mas o teto da instituição continua valendo para o valor
          // aprovado. excludeProjectId evita contar este projeto duas vezes
          // — ele já está em `projects` (stage validacao/homologacao) e
          // entraria no comprometido existente via budgetTotal.
          if (project.organizationId && project.evaluationYear) {
            await checkOrganizationBudget(
              project.organizationId,
              project.evaluationYear,
              parsedInput.approvedAmount,
              parsedInput.projectId,
            );
          }

          patch.approvedAt = now;
          patch.approvedAmount = parsedInput.approvedAmount.toFixed(2);
          patch.approvedParcelas = parsedInput.approvedParcelas ?? null;
          patch.approvedMesesPagamento =
            parsedInput.approvedMesesPagamento ?? null;
        }

        const updated = await tx
          .update(projects)
          .set(patch)
          .where(eq(projects.id, parsedInput.projectId))
          .returning();

        const afterProject = updated[0];
        if (!afterProject)
          throw new BusinessError("Falha ao registrar decisão");

        // Version snapshot — mesmo caminho de transitionProjectStage.
        await createVersionSnapshot(
          tx,
          parsedInput.projectId,
          parsedInput.decision as ProjectStage,
          {
            ...afterProject,
            _source: "registerProjectDecision",
            notes: parsedInput.notes,
            transitionedAt: now.toISOString(),
            transitionedBy: ctx.actorId,
          },
          ctx.actorId,
        );

        // Provisionamento financeiro na MESMA transação (P-0.14b) — reusa
        // generatePaymentSchedule/onProjectApproved, que agora leem
        // approvedAmount/approvedParcelas/approvedMesesPagamento com
        // fallback para os campos pedidos.
        if (
          parsedInput.decision === "aprovado" &&
          afterProject.parcelas &&
          afterProject.meses &&
          afterProject.budgetTotal
        ) {
          await withSystemRole(tx, async (sysTx) => {
            await generatePaymentSchedule(afterProject, sysTx);
            await onProjectApproved(parsedInput.projectId, sysTx);
          });
        }

        await withSystemRole(tx, (sysTx) =>
          logProjectAudit(
            {
              actorId: ctx.actorId,
              action: "project.decision_registered",
              entity: "project",
              entityId: parsedInput.projectId,
              diff: {
                from: project.stage,
                to: parsedInput.decision,
                requestedAmount: project.budgetTotal,
                approvedAmount: afterProject.approvedAmount,
                approvedParcelas: afterProject.approvedParcelas,
                approvedMesesPagamento: afterProject.approvedMesesPagamento,
                notes: parsedInput.notes,
                transitionedAt: afterProject.updatedAt.toISOString(),
              },
            },
            sysTx,
          ),
        );

        return { afterProject };
      },
    );

    return { project: afterProject };
  });

// ---------------------------------------------------------------------------
// createContestation — max 2 per project, 1 per person; returns to votacao
// ---------------------------------------------------------------------------

// D1-004 (AUDIT/04-BACKLOG-CORRECAO.md PACOTE 9): contestação é privilégio
// de diretor/conselheiro (BRAIN.md:308, "7 dias para contestação por
// qualquer diretor/conselheiro") — projetosAction só exigia autenticação,
// deixando a RLS como única barreira contra um submissor.
export const createContestation = conselheiroDiretorAction
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
