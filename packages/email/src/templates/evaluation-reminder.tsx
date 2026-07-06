import * as React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  emailColors,
  emailFontFamily,
} from "../components/layout";

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

export interface EvaluationReminderEmailProps {
  recipientName: string;
  meetingDateStr: string;
  projectTitles: string[];
  projetosUrl: string;
}

export function EvaluationReminderEmail({
  recipientName,
  meetingDateStr,
  projectTitles,
  projetosUrl,
}: EvaluationReminderEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout
      preview={`Avaliações pendentes para a reunião de ${meetingDateStr}`}
    >
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.accent,
          marginBottom: 8,
        }}
      >
        Avaliações pendentes
      </Text>

      <Text style={text}>
        Olá, {firstName}. A reunião de {meetingDateStr} está próxima e você
        ainda tem {projectTitles.length}{" "}
        {projectTitles.length === 1
          ? "avaliação pendente"
          : "avaliações pendentes"}
        :
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.accent}`,
        }}
      >
        {projectTitles.map((title) => (
          <Text
            key={title}
            style={{
              fontFamily: emailFontFamily,
              fontSize: 14,
              color: emailColors.foreground,
              margin: "0 0 6px",
            }}
          >
            • {title}
          </Text>
        ))}
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={projetosUrl}
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
          Avaliar projetos
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Concluir as avaliações antes da reunião ajuda a manter o processo de
        homologação dentro do prazo.
      </Text>
    </EmailLayout>
  );
}

export default EvaluationReminderEmail;
