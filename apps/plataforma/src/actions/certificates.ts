"use server";

import * as React from "react";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  renderToBuffer,
} from "@react-pdf/renderer";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { certificates } from "@hebron/db/schema";
import { plataformaAction } from "../lib/safe-action";

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
    // Sem join em `courses`/`users`: curso arquivado ou despublicado some
    // da RLS do aluno (courses_select_published, 0082) e um innerJoin
    // barraria o download do próprio certificado (P-6.17). O certificado é
    // lido por RLS própria (certificates_select_own); título do curso e
    // nome do aluno vêm de plataforma.verify_certificate (SECURITY DEFINER,
    // imune à RLS de courses).
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(certificates)
          .where(eq(certificates.id, input.certificateId))
          .limit(1),
    );
    const certificate = rows[0];
    if (!certificate) throw new BusinessError("Certificado não encontrado");
    if (
      certificate.userId !== ctx.actorId &&
      !ctx.roles.includes("super_admin")
    ) {
      throw new BusinessError("Acesso negado");
    }

    const verification = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx.execute<{ course_title: string; user_name: string | null }>(
          sql`SELECT * FROM plataforma.verify_certificate(${certificate.verificationHash})`,
        ),
    );
    const v = verification[0];
    if (!v) throw new BusinessError("Certificado não encontrado");

    const pdfBuffer = await renderToBuffer(
      buildCertificatePdfDocument({
        courseTitle: v.course_title,
        userName: v.user_name ?? "Aluno",
        issuedAt: certificate.issuedAt,
        verificationHash: certificate.verificationHash,
      }),
    );

    return {
      fileName: `certificado-${certificate.verificationHash.slice(0, 8)}.pdf`,
      base64: pdfBuffer.toString("base64"),
    };
  });
