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

export interface NewCourseEmailProps {
  recipientName: string;
  courseTitle: string;
  courseDescription: string;
  category: string;
  instructorName: string;
  courseUrl: string;
}

export function NewCourseEmail({
  recipientName,
  courseTitle,
  courseDescription,
  category,
  instructorName,
  courseUrl,
}: NewCourseEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout preview={`Novo curso disponível: ${courseTitle}`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Novo curso disponível
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um novo curso acabou de ser publicado na plataforma de
        ensino da Hebron Aseec.
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
          {category}
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: "0 0 6px",
          }}
        >
          {courseTitle}
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 13,
            color: emailColors.foreground,
            margin: "0 0 6px",
          }}
        >
          {courseDescription}
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 12,
            color: emailColors.muted,
            margin: 0,
          }}
        >
          Instrutor: {instructorName}
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
          Ver curso
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Você recebeu este email porque optou por receber novidades da Hebron
        Aseec. Para deixar de receber, ajuste suas preferências de comunicação
        em &ldquo;Meus dados&rdquo;.
      </Text>
    </EmailLayout>
  );
}

NewCourseEmail.PreviewProps = {
  recipientName: "Camila Ribeiro",
  courseTitle: "Fundamentos da Liderança Cristã",
  courseDescription:
    "Um curso introdutório sobre princípios bíblicos de liderança para líderes de ministério.",
  category: "Liderança",
  instructorName: "Pr. José Almeida",
  courseUrl: "https://plataforma.hebronaseec.com.br/cursos/9",
} satisfies NewCourseEmailProps;

export default NewCourseEmail;
