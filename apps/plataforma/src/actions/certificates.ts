"use server";

import * as React from "react";
import { z } from "zod";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import {
  certificates,
  courses,
  enrollments,
  progress,
  users,
} from "@hebron/db/schema";
import type { Certificate } from "@hebron/db/schema";
import { plataformaAction } from "../lib/safe-action";
import { logPlataformaAudit } from "../lib/audit";

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
  if (!row) throw new Error("Falha ao emitir certificado");

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

// ---------------------------------------------------------------------------
// downloadCertificatePdf — PDF gerado com @react-pdf/renderer (D-6),
// retornado em base64 para download direto no client (mesmo padrão de
// exportMonthlyReport em apps/financeiro). O PDF exibe a URL completa da
// rota pública de verificação (P-6.14, apps/plataforma/src/app/certificado/
// verificar) — não só o hash cru, para o portador conferir com um clique.
// ---------------------------------------------------------------------------

const PLATAFORMA_BASE_URL =
  process.env.NEXT_PUBLIC_PLATAFORMA_URL ??
  "https://plataforma.hebronaseec.com.br";

function verificationUrl(hash: string): string {
  return `${PLATAFORMA_BASE_URL}/certificado/verificar?hash=${hash}`;
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10,
    color: "#6B7280",
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 24,
    textAlign: "center",
  },
  body: { fontSize: 12, textAlign: "center", marginBottom: 8 },
  name: { fontSize: 18, fontWeight: 700, marginTop: 8, marginBottom: 8 },
  course: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 24,
    textAlign: "center",
  },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 32, textAlign: "center" },
});

function buildCertificatePdfDocument(params: {
  courseTitle: string;
  userName: string;
  issuedAt: Date;
  verificationHash: string;
}) {
  const issuedDate = params.issuedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: pdfStyles.page },
      React.createElement(Text, { style: pdfStyles.eyebrow }, "HEBRON ASEEC"),
      React.createElement(
        Text,
        { style: pdfStyles.title },
        "Certificado de Conclusão",
      ),
      React.createElement(Text, { style: pdfStyles.body }, "Certificamos que"),
      React.createElement(Text, { style: pdfStyles.name }, params.userName),
      React.createElement(
        Text,
        { style: pdfStyles.body },
        "concluiu integralmente o curso",
      ),
      React.createElement(
        Text,
        { style: pdfStyles.course },
        params.courseTitle,
      ),
      React.createElement(
        Text,
        { style: pdfStyles.body },
        `Emitido em ${issuedDate}`,
      ),
      React.createElement(
        Text,
        { style: pdfStyles.meta },
        `Verificação: ${verificationUrl(params.verificationHash)}`,
      ),
    ),
  );
}

const downloadCertificatePdfSchema = z.object({
  certificateId: z.string().uuid(),
});

export const downloadCertificatePdf = plataformaAction
  .schema(downloadCertificatePdfSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select({
            certificate: certificates,
            courseTitle: courses.title,
            userFullName: users.fullName,
          })
          .from(certificates)
          .innerJoin(courses, eq(courses.id, certificates.courseId))
          .innerJoin(users, eq(users.id, certificates.userId))
          .where(eq(certificates.id, input.certificateId))
          .limit(1),
    );
    const row = rows[0];
    if (!row) throw new Error("Certificado não encontrado");
    if (
      row.certificate.userId !== ctx.actorId &&
      !ctx.roles.includes("super_admin")
    ) {
      throw new Error("Acesso negado");
    }

    const pdfBuffer = await renderToBuffer(
      buildCertificatePdfDocument({
        courseTitle: row.courseTitle,
        userName: row.userFullName ?? "Aluno",
        issuedAt: row.certificate.issuedAt,
        verificationHash: row.certificate.verificationHash,
      }),
    );

    return {
      fileName: `certificado-${row.certificate.verificationHash.slice(0, 8)}.pdf`,
      base64: pdfBuffer.toString("base64"),
    };
  });
