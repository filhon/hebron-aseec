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

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export interface BatchApprovalEmailProps {
  recipientName: string;
  /** ISO date (YYYY-MM-DD) */
  weekStart: string;
  /** ISO date (YYYY-MM-DD) */
  weekEnd: string;
  payableCount: number;
  totalAmount: number;
  financeiroUrl: string;
}

export function BatchApprovalEmail({
  recipientName,
  weekStart,
  weekEnd,
  payableCount,
  totalAmount,
  financeiroUrl,
}: BatchApprovalEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout
      preview={`Lote de pagamentos aguarda aprovação — ${formatDate(weekStart)} a ${formatDate(weekEnd)}`}
    >
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Lote de pagamentos aguarda aprovação
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um lote de pagamentos foi criado para a semana de{" "}
        <strong>{formatDate(weekStart)}</strong> a{" "}
        <strong>{formatDate(weekEnd)}</strong> e aguarda sua aprovação.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.primary}`,
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
                  width: 150,
                  paddingBottom: 6,
                }}
              >
                Contas a pagar
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.foreground,
                  paddingBottom: 6,
                }}
              >
                {payableCount}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 12,
                  fontWeight: "600",
                  color: emailColors.muted,
                  width: 150,
                }}
              >
                Valor total
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.primary,
                }}
              >
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={financeiroUrl}
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
          Acessar módulo financeiro
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este email foi enviado automaticamente pelo agrupamento semanal de
        pagamentos (governança dual — BRAIN §6.5).
      </Text>
    </EmailLayout>
  );
}

export default BatchApprovalEmail;
