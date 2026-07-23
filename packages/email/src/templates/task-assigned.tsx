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

export interface TaskAssignedEmailProps {
  recipientName: string;
  taskTitle: string;
  workspaceLabel: string;
  priorityLabel: string;
  /** null quando a tarefa não tem prazo definido */
  dueDate: Date | null;
  /** Nome de quem atribuiu a tarefa (opcional — pode ser autoatribuição) */
  assignedByName?: string | null;
  taskUrl: string;
}

export function TaskAssignedEmail({
  recipientName,
  taskTitle,
  workspaceLabel,
  priorityLabel,
  dueDate,
  assignedByName,
  taskUrl,
}: TaskAssignedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const dueDateStr = dueDate
    ? dueDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Sem prazo definido";

  return (
    <EmailLayout preview={`Você foi atribuído à tarefa "${taskTitle}"`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Nova tarefa atribuída a você
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Text style={text}>
        {assignedByName ? (
          <>
            <strong>{assignedByName}</strong> atribuiu a você a tarefa{" "}
            <strong>&ldquo;{taskTitle}&rdquo;</strong>.
          </>
        ) : (
          <>
            Você foi atribuído à tarefa{" "}
            <strong>&ldquo;{taskTitle}&rdquo;</strong>.
          </>
        )}
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "14px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.primary}`,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={infoLabel}>Módulo</td>
              <td style={infoValue}>{workspaceLabel}</td>
            </tr>
            <tr>
              <td style={infoLabel}>Prioridade</td>
              <td style={infoValue}>{priorityLabel}</td>
            </tr>
            <tr>
              <td style={{ ...infoLabel, paddingBottom: 0 }}>Prazo</td>
              <td style={{ ...infoValue, paddingBottom: 0 }}>{dueDateStr}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={taskUrl}
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
          Ver tarefa
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Você recebeu este email porque foi designado como responsável por esta
        tarefa no módulo Tarefas.
      </Text>
    </EmailLayout>
  );
}

TaskAssignedEmail.PreviewProps = {
  recipientName: "Juliana Ferreira",
  taskTitle: "Revisar prestação de contas do 2º trimestre",
  workspaceLabel: "Financeiro",
  priorityLabel: "Alta",
  dueDate: new Date("2026-07-31"),
  assignedByName: "Marcos Andrade",
  taskUrl: "https://tarefas.hebronaseec.com.br/tarefas/123",
} satisfies TaskAssignedEmailProps;

export default TaskAssignedEmail;
