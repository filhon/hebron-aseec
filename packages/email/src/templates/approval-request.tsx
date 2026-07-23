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

export interface ApprovalRequestEmailProps {
  recipientName: string;
  taskTitle: string;
  requestedByName: string;
  requestedStatusLabel: string;
  notes?: string | null;
  taskUrl: string;
}

export function ApprovalRequestEmail({
  recipientName,
  taskTitle,
  requestedByName,
  requestedStatusLabel,
  notes,
  taskUrl,
}: ApprovalRequestEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout preview={`Pedido de aprovação: "${taskTitle}"`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Pedido de aprovação
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Text style={text}>
        <strong>{requestedByName}</strong> solicita sua aprovação para avançar a
        tarefa <strong>&ldquo;{taskTitle}&rdquo;</strong>.
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
              <td style={infoLabel}>Solicitado por</td>
              <td style={infoValue}>{requestedByName}</td>
            </tr>
            <tr>
              <td
                style={notes ? infoLabel : { ...infoLabel, paddingBottom: 0 }}
              >
                Avançar para
              </td>
              <td
                style={
                  notes
                    ? {
                        ...infoValue,
                        fontWeight: "700",
                        color: emailColors.primary,
                      }
                    : {
                        ...infoValue,
                        paddingBottom: 0,
                        fontWeight: "700",
                        color: emailColors.primary,
                      }
                }
              >
                {requestedStatusLabel}
              </td>
            </tr>
            {notes ? (
              <tr>
                <td style={{ ...infoLabel, paddingBottom: 0 }}>Observações</td>
                <td style={{ ...infoValue, paddingBottom: 0 }}>{notes}</td>
              </tr>
            ) : null}
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
          Responder pedido
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Diretores e conselheiros não recebem tarefas operacionais — apenas
        pedidos de aprovação como este, para avançar o status de uma tarefa.
      </Text>
    </EmailLayout>
  );
}

ApprovalRequestEmail.PreviewProps = {
  recipientName: "Marcos Andrade",
  taskTitle: "Revisar prestação de contas do 2º trimestre",
  requestedByName: "Juliana Ferreira",
  requestedStatusLabel: "Concluída",
  notes: "Segue anexo o comprovante de despesas.",
  taskUrl: "https://tarefas.hebronaseec.com.br/tarefas/123",
} satisfies ApprovalRequestEmailProps;

export default ApprovalRequestEmail;
