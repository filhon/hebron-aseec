import * as React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  emailColors,
  emailFontFamily,
} from "../components/layout";

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const text: React.CSSProperties = {
  fontFamily: emailFontFamily,
  fontSize: 15,
  lineHeight: "1.65",
  color: emailColors.foreground,
  margin: "0 0 14px",
};

const textSm: React.CSSProperties = {
  fontFamily: emailFontFamily,
  fontSize: 13,
  lineHeight: "1.5",
  color: emailColors.muted,
  margin: "0 0 8px",
};

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export interface EnrollmentConfirmedEmailProps {
  recipientName: string;
  courseTitle: string;
  instructorName: string;
  courseUrl: string;
}

export function EnrollmentConfirmedEmail({
  recipientName,
  courseTitle,
  instructorName,
  courseUrl,
}: EnrollmentConfirmedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout preview={`Matrícula confirmada em "${courseTitle}"`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Matrícula confirmada
      </Text>

      <Text style={text}>
        Olá, {firstName}. Sua matrícula no curso{" "}
        <strong>&ldquo;{courseTitle}&rdquo;</strong> foi confirmada com sucesso.
        Você já pode começar a assistir às aulas.
      </Text>

      {/* Curso info */}
      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.primary}`,
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 11,
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: emailColors.muted,
            margin: "0 0 6px",
          }}
        >
          Instrutor
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: 0,
          }}
        >
          {instructorName}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={courseUrl}
          style={{
            backgroundColor: emailColors.accent,
            color: "#ffffff",
            fontFamily: emailFontFamily,
            fontSize: 15,
            fontWeight: "700",
            textDecoration: "none",
            padding: "14px 36px",
            borderRadius: 8,
            display: "inline-block",
          }}
        >
          Acessar curso
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Você recebeu este email porque se matriculou neste curso na plataforma
        de ensino da Hebron Aseec.
      </Text>
    </EmailLayout>
  );
}

EnrollmentConfirmedEmail.PreviewProps = {
  recipientName: "Camila Ribeiro",
  courseTitle: "Fundamentos da Liderança Cristã",
  instructorName: "Pr. José Almeida",
  courseUrl: "https://plataforma.hebronaseec.com.br/cursos/9",
} satisfies EnrollmentConfirmedEmailProps;

export default EnrollmentConfirmedEmail;
