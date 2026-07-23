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

export interface BudgetAlertEmailProps {
  costCenterName: string;
  year: number;
  plannedAmount: number;
  executedAmount: number;
  /** 0–100+ */
  pct: number;
  financeiroUrl: string;
}

export function BudgetAlertEmail({
  costCenterName,
  year,
  plannedAmount,
  executedAmount,
  pct,
  financeiroUrl,
}: BudgetAlertEmailProps) {
  return (
    <EmailLayout
      preview={`Orçamento de ${costCenterName} já executou ${pct.toFixed(0)}%`}
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
        Orçamento acima de 80% executado
      </Text>

      <Text style={text}>
        O orçamento de <strong>{costCenterName}</strong> para {year} atingiu{" "}
        <strong>{pct.toFixed(0)}%</strong> de execução.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.accent}`,
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
                Orçado ({year})
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
                {formatCurrency(plannedAmount)}
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
                Executado
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.accent,
                }}
              >
                {formatCurrency(executedAmount)} ({pct.toFixed(0)}%)
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={financeiroUrl}
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
          Ver orçamento
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este alerta é enviado uma única vez, no momento em que a execução do
        orçamento ultrapassa 80%.
      </Text>
    </EmailLayout>
  );
}

BudgetAlertEmail.PreviewProps = {
  costCenterName: "Manutenção Predial",
  year: 2026,
  plannedAmount: 50000,
  executedAmount: 42500,
  pct: 85,
  financeiroUrl:
    "https://financeiro.hebronaseec.com.br/centros-de-custo/manutencao",
} satisfies BudgetAlertEmailProps;

export default BudgetAlertEmail;
