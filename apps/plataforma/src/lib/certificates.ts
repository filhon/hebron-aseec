import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import { withSystemRole } from "@hebron/db/authenticated";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import { certificates, enrollments, progress } from "@hebron/db/schema";
import type { Certificate } from "@hebron/db/schema";
import { logPlataformaAudit } from "./audit";

// Módulo SEM "use server" (D1-003, PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md) —
// antes vivia em actions/certificates.ts, um arquivo "use server": toda
// função async exportada dali é registrada como Server Action invocável
// (Next.js App Router), o que expunha esta função — que recebe `tx` de uma
// transação já aberta, não um input de cliente — como superfície
// desnecessária. Agora só é alcançável através das actions que já fazem o
// gate (progress.ts::markLessonComplete, quizzes.ts::submitQuizAttempt).

// ---------------------------------------------------------------------------
// checkAndIssueCertificate — emissão automática ao concluir 100% das aulas
// da trilha (BRAIN §6.3), chamada por progress.ts (markLessonComplete) e
// quizzes.ts (submitQuizAttempt, quando o passe do quiz conclui a
// aula-quiz). A gravação em si acontece em plataforma.issue_certificate()
// (SECURITY DEFINER, migration 0045) — não há policy de INSERT para o
// próprio aluno em plataforma.certificates (0020_plataforma_rls.sql),
// então um INSERT direto daqui seria barrado pela RLS.
// ---------------------------------------------------------------------------

interface IssuedCertificateRow {
  id: string;
  course_id: string;
  user_id: string;
  issued_at: string;
  verification_hash: string;
  [key: string]: unknown;
}

export async function checkAndIssueCertificate(
  tx: AuthenticatedTx,
  params: { actorId: string; courseId: string },
): Promise<Certificate | null> {
  // Total real da trilha via plataforma.course_outline() (SECURITY DEFINER,
  // 0080_plataforma_course_outline.sql, P-6.2b) — um SELECT direto em
  // `lessons` aqui rodaria sob RLS (lessons_select_enrolled), contando só as
  // aulas já liberadas para o aluno em vez do curso inteiro. A outline já
  // exclui aula/módulo/curso arquivado (0082_plataforma_arquivamento.sql,
  // P-6.4b) — "concluídas" precisa interseccionar progress.lesson_id com
  // esse mesmo universo (P-6.16), nunca mais contar progress por
  // course_id: uma linha de progresso de aula arquivada sobrevive ao
  // arquivamento (por design) e infla o numerador se contada cru.
  const outlineRows = await tx.execute<{ lesson_id: string }>(
    sql`SELECT lesson_id FROM plataforma.course_outline(${params.courseId}::uuid)`,
  );
  const total = outlineRows.length;
  if (total === 0) return null;

  const outlineLessonIds = outlineRows.map((r) => r.lesson_id);
  const [completedRow] = await tx
    .select({ completed: sql<number>`count(*)::int` })
    .from(progress)
    .where(
      and(
        eq(progress.userId, params.actorId),
        isNotNull(progress.completedAt),
        inArray(progress.lessonId, outlineLessonIds),
      ),
    );

  const completed = completedRow?.completed ?? 0;
  if (completed < total) return null;

  await tx
    .update(enrollments)
    .set({ completedAt: sql`now()` })
    .where(
      and(
        eq(enrollments.courseId, params.courseId),
        eq(enrollments.userId, params.actorId),
        isNull(enrollments.completedAt),
      ),
    );

  const [existing] = await tx
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.courseId, params.courseId),
        eq(certificates.userId, params.actorId),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const rows = await tx.execute<IssuedCertificateRow>(
    sql`SELECT * FROM plataforma.issue_certificate(${params.courseId}::uuid)`,
  );
  const row = rows[0];
  if (!row) throw new BusinessError("Falha ao emitir certificado");

  const issued: Certificate = {
    id: row.id,
    courseId: row.course_id,
    userId: row.user_id,
    issuedAt: new Date(row.issued_at),
    verificationHash: row.verification_hash,
  };

  await withSystemRole(tx, (sysTx) =>
    logPlataformaAudit(
      {
        actorId: params.actorId,
        action: "certificate.issued",
        entity: "certificate",
        entityId: issued.id,
        diff: { courseId: params.courseId },
      },
      sysTx,
    ),
  );

  return issued;
}
