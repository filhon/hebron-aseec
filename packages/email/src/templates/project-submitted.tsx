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

export interface ProjectSubmittedEmailProps {
  recipientName: string;
  projectTitle: string;
  submitterName: string;
  projectType: "pontual" | "anual";
  organizationName?: string | null;
  projectUrl: string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  pontual: "Pontual (emergencial)",
  anual: "Anual",
};

export function ProjectSubmittedEmail({
  recipientName,
  projectTitle,
  submitterName,
  projectType,
  organizationName,
  projectUrl,
}: ProjectSubmittedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout preview={`Nova submissão de projeto: ${projectTitle}`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Nova submissão de projeto
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um novo projeto foi submetido e aguarda validação.
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
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: "0 0 14px",
          }}
        >
          {projectTitle}
        </Text>

        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 12,
                  fontWeight: "600",
                  color: emailColors.muted,
                  width: 140,
                  paddingBottom: 6,
                }}
              >
                Submissor
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  color: emailColors.foreground,
                  paddingBottom: 6,
                }}
              >
                {submitterName}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 12,
                  fontWeight: "600",
                  color: emailColors.muted,
                  width: 140,
                  paddingBottom: 6,
                }}
              >
                Tipo
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  color: emailColors.foreground,
                  paddingBottom: 6,
                }}
              >
                {PROJECT_TYPE_LABELS[projectType] ?? projectType}
              </td>
            </tr>
            {organizationName && (
              <tr>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 12,
                    fontWeight: "600",
                    color: emailColors.muted,
                    width: 140,
                  }}
                >
                  Organização
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    color: emailColors.foreground,
                  }}
                >
                  {organizationName}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={projectUrl}
          style={{
            backgroundColor: emailColors.primary,
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
          Revisar projeto
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este email foi enviado porque você é administrador da plataforma Hebron
        Aseec. Acesse o portal para iniciar a validação.
      </Text>
    </EmailLayout>
  );
}

export default ProjectSubmittedEmail;
