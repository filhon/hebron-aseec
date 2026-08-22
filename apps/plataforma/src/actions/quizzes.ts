"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  lessons,
  progress,
  quizAttempts,
  quizQuestions,
  quizzes,
} from "@hebron/db/schema";
import { createQuizSchema, submitQuizAttemptSchema } from "@hebron/validators";
import { plataformaAction, staffAction } from "../lib/safe-action";
import { checkAndIssueCertificate } from "../lib/certificates";
import { notifyCertificateIssued } from "../lib/notifications";

// ---------------------------------------------------------------------------
// createQuiz / updateQuiz — só sobre aulas do tipo "quiz". Alternativas
// (PATCH-023: só múltipla escolha) e nota mínima definidas em bloco por
// substituição das perguntas (delete + insert, não diff campo a campo).
// ---------------------------------------------------------------------------

export const createQuiz = staffAction
  .schema(createQuizSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const quiz = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [lesson] = await tx
          .select({ type: lessons.type })
          .from(lessons)
          .where(eq(lessons.id, input.lessonId))
          .limit(1);
        if (!lesson) throw new BusinessError("Aula não encontrada");
        if (lesson.type !== "quiz") {
          throw new BusinessError(
            "Só é possível criar quiz em aulas do tipo quiz",
          );
        }

        const [quizRow] = await tx
          .insert(quizzes)
          .values({
            lessonId: input.lessonId,
            passingScore: input.passingScore,
          })
          .returning();
        if (!quizRow) throw new BusinessError("Falha ao criar quiz");

        await tx.insert(quizQuestions).values(
          input.questions.map((question, index) => ({
            quizId: quizRow.id,
            text: question.text,
            order: index,
            options: question.options,
            correctOptionId: question.correctOptionId,
          })),
        );

        return quizRow;
      },
    );

    return { quiz };
  });

const updateQuizSchema = z.object({
  quizId: z.string().uuid(),
  questions: createQuizSchema.shape.questions,
  passingScore: createQuizSchema.shape.passingScore,
});

export const updateQuiz = staffAction
  .schema(updateQuizSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const quiz = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [quizRow] = await tx
          .update(quizzes)
          .set({ passingScore: input.passingScore, updatedAt: new Date() })
          .where(eq(quizzes.id, input.quizId))
          .returning();
        if (!quizRow) throw new BusinessError("Quiz não encontrado");

        await tx
          .delete(quizQuestions)
          .where(eq(quizQuestions.quizId, input.quizId));
        await tx.insert(quizQuestions).values(
          input.questions.map((question, index) => ({
            quizId: input.quizId,
            text: question.text,
            order: index,
            options: question.options,
            correctOptionId: question.correctOptionId,
          })),
        );

        return quizRow;
      },
    );

    return { quiz };
  });

// ---------------------------------------------------------------------------
// submitQuizAttempt — SEMÂNTICA (decisão D-5 da auditoria): score calculado
// sobre o total de perguntas do quiz (não sobre as respostas enviadas, para
// não recompensar submissões parciais); score >= passingScore conclui a
// aula-quiz (upsert em progress, mesmo caminho de markLessonComplete);
// tentativas ilimitadas, todas registradas em quiz_attempts (imutável).
// Tudo roda em uma única transação para que attempt, progress e emissão de
// certificado sejam atômicos.
// ---------------------------------------------------------------------------

export const submitQuizAttempt = plataformaAction
  .schema(submitQuizAttemptSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const result = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [quiz] = await tx
          .select({
            id: quizzes.id,
            lessonId: quizzes.lessonId,
            passingScore: quizzes.passingScore,
          })
          .from(quizzes)
          .where(eq(quizzes.id, input.quizId))
          .limit(1);
        if (!quiz) throw new BusinessError("Quiz não encontrado");

        const questions = await tx
          .select({
            id: quizQuestions.id,
            correctOptionId: quizQuestions.correctOptionId,
          })
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, input.quizId));
        if (questions.length === 0)
          throw new BusinessError("Quiz sem perguntas");

        const correctByQuestionId = new Map(
          questions.map((q) => [q.id, q.correctOptionId]),
        );
        const answeredCorrectly = input.answers.filter(
          (answer) =>
            correctByQuestionId.get(answer.questionId) === answer.optionId,
        ).length;
        const score = Math.round((answeredCorrectly / questions.length) * 100);
        const passed = score >= quiz.passingScore;

        const [attempt] = await tx
          .insert(quizAttempts)
          .values({
            quizId: quiz.id,
            userId: ctx.actorId,
            answers: input.answers,
            score,
            passed,
          })
          .returning();
        if (!attempt) throw new BusinessError("Falha ao registrar tentativa");

        if (!passed) return { attempt, certificate: null };

        const [lesson] = await tx
          .select({ courseId: lessons.courseId })
          .from(lessons)
          .where(eq(lessons.id, quiz.lessonId))
          .limit(1);
        if (!lesson) throw new BusinessError("Aula do quiz não encontrada");

        await tx
          .insert(progress)
          .values({
            userId: ctx.actorId,
            lessonId: quiz.lessonId,
            courseId: lesson.courseId,
            completedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [progress.userId, progress.lessonId],
            set: { completedAt: new Date() },
          });

        const certificate = await checkAndIssueCertificate(tx, {
          actorId: ctx.actorId,
          courseId: lesson.courseId,
        });

        return { attempt, certificate };
      },
    );

    // Notificação best-effort, fora da transação (P-6.10).
    if (result.certificate) {
      await notifyCertificateIssued(result.certificate.id);
    }

    return result;
  });
