"use server";

import { z } from "zod";
import { eq, and, count, countDistinct, inArray, isNull } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import {
  votes,
  projects,
  projectVersions,
  roleAssignments,
} from "@hebron/db/schema";
import { VALID_STAGE_TRANSITIONS } from "@hebron/db/schema";
import { conselheiroDiretorAction, superAdminAction } from "../lib/safe-action";
import { logProjectAudit } from "../lib/audit";
import {
  computeVoteResult,
  computeMajority,
  type VoteResult,
} from "../lib/vote-result";

// ---------------------------------------------------------------------------
// Helpers — take an explicit tx executor from withAuthenticatedContext.
// ---------------------------------------------------------------------------

type DbExecutor = Pick<AuthenticatedTx, "select" | "update" | "insert">;

async function getVotingProject(executor: DbExecutor, projectId: string) {
  const rows = await executor
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  const project = rows[0];
  if (!project) throw new BusinessError("Projeto não encontrado");
  if (project.stage !== "votacao")
    throw new BusinessError("Projeto não está em fase de votação");
  return project;
}

// Conta PESSOAS distintas, não atribuições de papel (F2-P5): um usuário com
// diretor+conselheiro simultaneamente não pode contar duas vezes no quórum
// nem no total de elegíveis do fechamento automático. `revokedAt IS NULL`
// (P-2.8b): um papel revogado não deve contar no denominador — o mesmo
// filtro de "papel ativo" usado por resolveSession/has_role, que já barra o
// voto desse usuário no gate da action.
async function countEligibleVoters(executor: DbExecutor): Promise<number> {
  const result = await executor
    .select({ count: countDistinct(roleAssignments.userId) })
    .from(roleAssignments)
    .where(
      and(
        inArray(roleAssignments.role, ["diretor", "conselheiro"]),
        isNull(roleAssignments.revokedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

// Busca os números no banco e delega o cálculo (quórum, maioria, decisão)
// a computeVoteResult (lib/vote-result.ts) — única definição da fórmula no
// repositório, importada também pelos testes (P-2.12b).
async function getVoteResult(
  executor: AuthenticatedTx,
  projectId: string,
): Promise<VoteResult> {
  const totalEligible = await countEligibleVoters(executor);

  // O SELECT em votes é restrito a super_admin por RLS ("cédula secreta" —
  // nem o próprio diretor lê a cédula que lançou, migration 0009). Sem
  // isso, getVoteResult rodando no contexto autenticado de um
  // diretor/conselheiro comum sempre veria 0 votos, e o auto-close de
  // castVote nunca dispararia a não ser que o voto decisivo fosse de um
  // super_admin (achado P-2.8b). withSystemRole eleva só esta leitura
  // agregada, dentro da mesma transação — nunca expõe quem votou o quê,
  // só o total/maioria retornados aqui.
  const projectVotes = await withSystemRole(executor, (sysTx) =>
    sysTx
      .select({ value: votes.value })
      .from(votes)
      .where(eq(votes.projectId, projectId)),
  );

  const totalVoted = projectVotes.length;
  const inFavor = projectVotes.filter((v) => v.value).length;

  return computeVoteResult(totalEligible, totalVoted, inFavor);
}

async function getNextVersionNumber(
  executor: DbExecutor,
  projectId: string,
): Promise<number> {
  const result = await executor
    .select({ count: count() })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));

  return (result[0]?.count ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// castVote — secret vote; voter identity never exposed to other participants
//
// Votação é governança dual (decisão F3-Q4): o voto, a eventual transição de
// estágio e as entradas de audit correspondentes são atômicos — se o audit
// falhar, nada do voto é persistido. withSystemRole escapa a RLS só para o
// INSERT em admin.audit_log (policy é TO service_role), dentro da mesma tx.
//
// Mudar de voto (P-2.8d, decisão b, PATCH-028): permitido livremente
// enquanto o projeto está em `votacao` — "até a votação fechar" já é
// garantido pelo próprio ciclo de vida, já que getVotingProject rejeita
// qualquer voto assim que o projeto sai desse estágio. Duplo clique com o
// MESMO valor continua idempotente e silencioso (nenhuma escrita, nenhum
// audit novo); valor DIFERENTE atualiza a linha e grava `vote.changed`. O
// UPDATE roda via withSystemRole, não via `tx` — RLS de UPDATE precisa
// primeiro "enxergar" a linha, e a policy de SELECT de votes (cédula
// secreta) nega isso até ao próprio votante (nem uma policy de UPDATE
// dedicada resolveria: a checagem de visibilidade do UPDATE herda a mesma
// negação). A escrita fica escopada pelo WHERE explícito em
// (projectId, ctx.actorId), não por RLS — mesmo raciocínio já aplicado ao
// INSERT em admin.audit_log e à leitura agregada de getVoteResult.
// ---------------------------------------------------------------------------

export const castVote = conselheiroDiretorAction
  .schema(
    z.object({
      projectId: z.string().uuid("Projeto inválido"),
      // true = "Sinto paz em investir", false = "Não sinto paz"
      value: z.boolean(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);

      // SELECT em votes é restrito por RLS a super_admin (cédula secreta) —
      // mas o próprio votante pode saber o próprio voto anterior.
      // withSystemRole eleva só esta leitura pontual, dentro da mesma
      // transação, só para decidir se é voto novo / duplo clique / mudança.
      const existingVoteRows = await withSystemRole(tx, (sysTx) =>
        sysTx
          .select({ value: votes.value })
          .from(votes)
          .where(
            and(
              eq(votes.projectId, parsedInput.projectId),
              eq(votes.userId, ctx.actorId),
            ),
          )
          .limit(1),
      );
      const previousValue = existingVoteRows[0]?.value ?? null;
      const isNewVote = previousValue === null;
      const valueChanged = !isNewVote && previousValue !== parsedInput.value;

      if (isNewVote) {
        // Insert normal via `tx` — RLS (votes_insert_own) continua sendo a
        // segunda camada de defesa aqui, como sempre foi. onConflictDoNothing
        // permanece como rede de segurança contra corrida entre duplo clique
        // concorrente (dois cliques quase simultâneos com o MESMO valor
        // novo, entre a leitura acima e este insert).
        await tx
          .insert(votes)
          .values({
            projectId: parsedInput.projectId,
            userId: ctx.actorId,
            value: parsedInput.value,
          })
          .onConflictDoNothing();
      } else if (valueChanged) {
        await withSystemRole(tx, (sysTx) =>
          sysTx
            .update(votes)
            .set({ value: parsedInput.value })
            .where(
              and(
                eq(votes.projectId, parsedInput.projectId),
                eq(votes.userId, ctx.actorId),
              ),
            ),
        );
      }
      // Duplo clique com o mesmo valor: nenhuma escrita, nenhum audit novo.

      // After every vote/change, re-check if quorum is now met and all eligible have voted
      const result = await getVoteResult(tx, parsedInput.projectId);

      let stageTransitioned = false;

      if (result.quorumMet && result.approved !== null) {
        // All eligible voted or quorum reached with decisive majority — auto-close
        const totalEligible = await countEligibleVoters(tx);
        if (result.totalVoted >= totalEligible) {
          // O mapa de estágios (VALID_STAGE_TRANSITIONS) não permite
          // votacao → reprovado direto — toda votação conclusiva
          // (aprovação OU reprovação) entra em homologação; a reprovação se
          // confirma lá se ninguém contestar em 7 dias, no lugar de ficar
          // presa em votação sem decisão nenhuma (P-2.8b).
          const newStage = "homologacao" as const;

          const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
          if (!(validNextStages as string[]).includes(newStage)) {
            throw new BusinessError(
              `Transição inválida: ${project.stage} → ${newStage}. ` +
                `Próximos estágios válidos: ${validNextStages.join(", ")}`,
            );
          }

          const versionNumber = await getNextVersionNumber(
            tx,
            parsedInput.projectId,
          );

          await tx
            .update(projects)
            .set({ stage: newStage, updatedAt: new Date() })
            .where(eq(projects.id, parsedInput.projectId));

          await tx.insert(projectVersions).values({
            projectId: parsedInput.projectId,
            versionNumber,
            stage: newStage,
            data: {
              trigger: "vote_complete",
              result,
              // Decisão real da votação — distinta de result.approved, que
              // é null quando o quórum não foi atingido (não é o caso
              // aqui, mas mantém o campo com o mesmo nome usado por
              // triggerPanicButton). Consultado por
              // runHomologacaoAutoApprove (packages/jobs) para não
              // aprovar por omissão uma votação que reprovou.
              voteApproved: result.approved,
              transitionedAt: new Date().toISOString(),
            },
            createdBy: ctx.actorId,
          });

          stageTransitioned = true;

          await withSystemRole(tx, (sysTx) =>
            logProjectAudit(
              {
                actorId: ctx.actorId,
                action: "project.stage_transition",
                entity: "project",
                entityId: parsedInput.projectId,
                diff: {
                  from: project.stage,
                  to: newStage,
                  trigger: "vote_complete",
                  result,
                },
              },
              sysTx,
            ),
          );
        }
      }

      // Audit the vote itself — só quando algo foi de fato escrito. Duplo
      // clique com o mesmo valor não gera entrada nova (idempotente e
      // silencioso); mudança de valor grava `vote.changed` com o valor
      // anterior, não `vote.cast` de novo.
      if (isNewVote) {
        await withSystemRole(tx, (sysTx) =>
          logProjectAudit(
            {
              actorId: ctx.actorId,
              action: "vote.cast",
              entity: "vote",
              entityId: parsedInput.projectId,
              diff: {
                projectId: parsedInput.projectId,
                value: parsedInput.value,
                resultAfterVote: {
                  totalVoted: result.totalVoted,
                  quorumMet: result.quorumMet,
                },
              },
            },
            sysTx,
          ),
        );
      } else if (valueChanged) {
        await withSystemRole(tx, (sysTx) =>
          logProjectAudit(
            {
              actorId: ctx.actorId,
              action: "vote.changed",
              entity: "vote",
              entityId: parsedInput.projectId,
              diff: {
                projectId: parsedInput.projectId,
                previousValue,
                value: parsedInput.value,
                resultAfterVote: {
                  totalVoted: result.totalVoted,
                  quorumMet: result.quorumMet,
                },
              },
            },
            sysTx,
          ),
        );
      }

      return { ok: true, result, stageTransitioned };
    });
  });

// ---------------------------------------------------------------------------
// closeVoting — super_admin fecha manualmente uma votação com quórum já
// atingido (F2-P6, decisão F2-Q5).
//
// Diferente de triggerPanicButton (a válvula de escape do BRAIN para "sem
// quórum"), closeVoting é o caminho comum: quórum atingido e maioria
// formada, mas turnout < 100% — sem isso a votação ficava aberta para
// sempre (nenhum job agendado força o fechamento). Exige quórum; se não
// atingido, orienta o uso do botão de pânico em vez de duplicar sua lógica.
// ---------------------------------------------------------------------------

export const closeVoting = superAdminAction
  .schema(
    z.object({
      projectId: z.string().uuid("Projeto inválido"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);
      const result = await getVoteResult(tx, parsedInput.projectId);

      if (!result.quorumMet) {
        throw new BusinessError(
          "Quórum não atingido — use o botão de pânico para forçar o encerramento.",
        );
      }

      // Mesma regra de castVote: o mapa não permite votacao → reprovado
      // direto (P-2.8b).
      const newStage = "homologacao" as const;

      const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
      if (!(validNextStages as string[]).includes(newStage)) {
        throw new BusinessError(
          `Transição inválida: ${project.stage} → ${newStage}. ` +
            `Próximos estágios válidos: ${validNextStages.join(", ")}`,
        );
      }

      const versionNumber = await getNextVersionNumber(
        tx,
        parsedInput.projectId,
      );

      await tx
        .update(projects)
        .set({ stage: newStage, updatedAt: new Date() })
        .where(eq(projects.id, parsedInput.projectId));

      await tx.insert(projectVersions).values({
        projectId: parsedInput.projectId,
        versionNumber,
        stage: newStage,
        data: {
          trigger: "manual_close",
          actorId: ctx.actorId,
          result,
          voteApproved: result.approved,
          transitionedAt: new Date().toISOString(),
        },
        createdBy: ctx.actorId,
      });

      await withSystemRole(tx, (sysTx) =>
        logProjectAudit(
          {
            actorId: ctx.actorId,
            action: "project.stage_transition",
            entity: "project",
            entityId: parsedInput.projectId,
            diff: {
              from: project.stage,
              to: newStage,
              trigger: "manual_close",
              result,
            },
          },
          sysTx,
        ),
      );

      return { ok: true, newStage, result };
    });
  });

// ---------------------------------------------------------------------------
// triggerPanicButton — super_admin force-closes voting
// "maioria+1 dos existentes": computes result from existing votes and closes
// ---------------------------------------------------------------------------

export const triggerPanicButton = superAdminAction
  .schema(
    z.object({
      projectId: z.string().uuid("Projeto inválido"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const project = await getVotingProject(tx, parsedInput.projectId);

      const result = await getVoteResult(tx, parsedInput.projectId);

      // Force-decide: whichever side has majority among existing votes wins;
      // tie resolves to reprovado (conservative default). A decisão é
      // aplicada em homologação, não escrita direto — mesmo mapa de
      // castVote/closeVoting (P-2.8b). Note que `approved` aqui é a decisão
      // FORÇADA (maioria entre os votos existentes, ignorando quórum) —
      // diferente de `result.approved`, que é null quando o quórum não foi
      // atingido (o caso normal de uso do botão de pânico).
      const approved = computeMajority(result.inFavor, result.against);
      const newStage = "homologacao" as const;

      const validNextStages = VALID_STAGE_TRANSITIONS[project.stage];
      if (!(validNextStages as string[]).includes(newStage)) {
        throw new BusinessError(
          `Transição inválida: ${project.stage} → ${newStage}. ` +
            `Próximos estágios válidos: ${validNextStages.join(", ")}`,
        );
      }

      const versionNumber = await getNextVersionNumber(
        tx,
        parsedInput.projectId,
      );

      await tx
        .update(projects)
        .set({ stage: newStage, updatedAt: new Date() })
        .where(eq(projects.id, parsedInput.projectId));

      await tx.insert(projectVersions).values({
        projectId: parsedInput.projectId,
        versionNumber,
        stage: newStage,
        data: {
          trigger: "panic_button",
          actorId: ctx.actorId,
          result,
          voteApproved: approved,
          transitionedAt: new Date().toISOString(),
        },
        createdBy: ctx.actorId,
      });

      await withSystemRole(tx, (sysTx) =>
        logProjectAudit(
          {
            actorId: ctx.actorId,
            action: "vote.panic",
            entity: "project",
            entityId: parsedInput.projectId,
            diff: {
              from: project.stage,
              to: newStage,
              trigger: "panic_button",
              result,
            },
          },
          sysTx,
        ),
      );

      return { ok: true, newStage, result };
    });
  });
