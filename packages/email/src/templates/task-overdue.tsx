import * as React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  emailColors,
  emailFontFamily,
} from "../components/layout";

const OVERDUE_COLOR = "#DC2626";

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

const infoLabel: React.CSSProperties = {
  fontFamily: emailFontFamily,
  fontSize: 12,
  fontWeight: "600",
  color: emailColors.muted,
  width: 130,
  paddingBottom: 6,
};

const infoValue: React.CSSProperties = {
  fontFamily: emailFontFamily,
  fontSize: 13,
  color: emailColors.foreground,
  paddingBottom: 6,
};

export interface TaskOverdueEmailProps {
  recipientName: string;
  taskTitle: string;
  workspaceLabel: string;
  dueDate: Date;
  taskUrl: string;
}

export function TaskOverdueEmail({
  recipientName,
  taskTitle,
  workspaceLabel,
  dueDate,
  taskUrl,
}: TaskOverdueEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const dueDateStr = dueDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <EmailLayout preview={`Tarefa em atraso: "${taskTitle}"`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: OVERDUE_COLOR,
          marginBottom: 8,
        }}
      >
        Tarefa em atraso
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Text style={text}>
        A tarefa <strong>&ldquo;{taskTitle}&rdquo;</strong>, sob sua
        responsabilidade, ultrapassou o prazo estabelecido.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "14px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${OVERDUE_COLOR}`,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={infoLabel}>Módulo</td>
              <td style={infoValue}>{workspaceLabel}</td>
            </tr>
            <tr>
              <td style={{ ...infoLabel, paddingBottom: 0 }}>Prazo</td>
              <td
                style={{
                  ...infoValue,
                  paddingBottom: 0,
                  fontWeight: "700",
                  color: OVERDUE_COLOR,
                }}
              >
                Venceu em {dueDateStr}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={taskUrl}
          style={{
            backgroundColor: OVERDUE_COLOR,
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
          Ver tarefa
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Atualize o status da tarefa ou ajuste o prazo assim que possível.
      </Text>
    </EmailLayout>
  );
}

export default TaskOverdueEmail;
