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

export type ReportReminderType =
  | "seven_days_before"
  | "due_today"
  | "seven_days_before_expiry";

const REMINDER_CONFIG: Record<
  ReportReminderType,
  {
    preview: string;
    heading: string;
    urgencyColor: string;
    urgencyLabel: string;
    bodyText: (projectTitle: string, dueDateStr: string) => string;
  }
> = {
  seven_days_before: {
    preview: "Relatório de projeto vence em 7 dias",
    heading: "Lembrete: relatório em 7 dias",
    urgencyColor: emailColors.primary,
    urgencyLabel: "7 dias para o prazo",
    bodyText: (title, date) =>
      `O relatório do projeto "${title}" deve ser entregue até ${date}. Você ainda tem 7 dias — aproveite para reunir as informações necessárias.`,
  },
  due_today: {
    preview: "Relatório de projeto vence hoje",
    heading: "Relatório vence hoje",
    urgencyColor: emailColors.accent,
    urgencyLabel: "Prazo: hoje",
    bodyText: (title) =>
      `O prazo para entrega do relatório do projeto "${title}" é hoje. Envie seu relatório agora para evitar o bloqueio de pagamentos.`,
  },
  seven_days_before_expiry: {
    preview: "Relatório em atraso — prazo de expiração em 7 dias",
    heading: "Relatório em atraso",
    urgencyColor: "#DC2626",
    urgencyLabel: "7 dias para expirar",
    bodyText: (title, date) =>
      `O relatório do projeto "${title}" está em atraso. O prazo final de expiração é ${date}. Após esta data, os pagamentos poderão ser bloqueados permanentemente.`,
  },
};

export interface ReportReminderEmailProps {
  recipientName: string;
  projectTitle: string;
  reminderType: ReportReminderType;
  dueDate: Date;
  projectUrl: string;
}

export function ReportReminderEmail({
  recipientName,
  projectTitle,
  reminderType,
  dueDate,
  projectUrl,
}: ReportReminderEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const config = REMINDER_CONFIG[reminderType];

  const dueDateStr = dueDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <EmailLayout preview={config.preview}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: config.urgencyColor,
          marginBottom: 8,
        }}
      >
        {config.heading}
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Text style={text}>{config.bodyText(projectTitle, dueDateStr)}</Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "14px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${config.urgencyColor}`,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 12,
                  fontWeight: "600",
                  color: emailColors.muted,
                  width: 130,
                  paddingBottom: 6,
                }}
              >
                Projeto
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  color: emailColors.foreground,
                  paddingBottom: 6,
                }}
              >
                {projectTitle}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 12,
                  fontWeight: "600",
                  color: emailColors.muted,
                  width: 130,
                }}
              >
                Prazo
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: config.urgencyColor,
                }}
              >
                {config.urgencyLabel} — {dueDateStr}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={projectUrl}
          style={{
            backgroundColor: config.urgencyColor,
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
          Enviar relatório
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        A não entrega do relatório dentro do prazo pode resultar no bloqueio de
        pagamentos futuros do projeto. Em caso de dúvidas, entre em contato com
        a administração.
      </Text>
    </EmailLayout>
  );
}

ReportReminderEmail.PreviewProps = {
  recipientName: "Paulo Henrique Souza",
  projectTitle: "Restauração do telhado da capela sede",
  reminderType: "seven_days_before",
  dueDate: new Date("2026-07-30"),
  projectUrl: "https://projetos.hebronaseec.com.br/projetos/55",
} satisfies ReportReminderEmailProps;

export default ReportReminderEmail;
