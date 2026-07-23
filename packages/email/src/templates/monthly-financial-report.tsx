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

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export interface MonthlyFinancialReportCategoryTotal {
  categoryName: string;
  type: "receita" | "despesa";
  total: number;
}

export interface MonthlyFinancialReportEmailProps {
  recipientName: string;
  /** 1–12 */
  month: number;
  year: number;
  totalRevenue: number;
  totalExpense: number;
  categoryTotals: MonthlyFinancialReportCategoryTotal[];
  financeiroUrl: string;
}

export function MonthlyFinancialReportEmail({
  recipientName,
  month,
  year,
  totalRevenue,
  totalExpense,
  categoryTotals,
  financeiroUrl,
}: MonthlyFinancialReportEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const monthName = MONTH_NAMES[month - 1] ?? String(month);
  const result = totalRevenue - totalExpense;

  return (
    <EmailLayout
      preview={`Relatório financeiro de ${monthName}/${year} — PDF e XLSX em anexo`}
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
        Relatório financeiro mensal
      </Text>

      <Text style={text}>
        Olá, {firstName}. Segue o relatório financeiro consolidado de{" "}
        <strong>
          {monthName} de {year}
        </strong>
        . O detalhamento completo está anexado em PDF e XLSX.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 20,
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
                Receitas
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#16A34A",
                  paddingBottom: 6,
                }}
              >
                {formatCurrency(totalRevenue)}
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
                  paddingBottom: 6,
                }}
              >
                Despesas
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.accent,
                  paddingBottom: 6,
                }}
              >
                {formatCurrency(totalExpense)}
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
                Resultado
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.primary,
                }}
              >
                {formatCurrency(result)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {categoryTotals.length > 0 && (
        <Section style={{ marginBottom: 28 }}>
          <Text
            style={{
              ...textSm,
              fontWeight: "700",
              color: emailColors.foreground,
              margin: "0 0 8px",
            }}
          >
            Totais por categoria
          </Text>
          <table width="100%" cellPadding={0} cellSpacing={0}>
            <tbody>
              {categoryTotals.map((c) => (
                <tr key={c.categoryName}>
                  <td
                    style={{
                      fontFamily: emailFontFamily,
                      fontSize: 13,
                      color: emailColors.foreground,
                      padding: "4px 0",
                      borderBottom: `1px solid ${emailColors.border}`,
                    }}
                  >
                    {c.categoryName}
                  </td>
                  <td
                    style={{
                      fontFamily: emailFontFamily,
                      fontSize: 13,
                      fontWeight: "700",
                      textAlign: "right",
                      color:
                        c.type === "receita" ? "#16A34A" : emailColors.accent,
                      padding: "4px 0",
                      borderBottom: `1px solid ${emailColors.border}`,
                    }}
                  >
                    {formatCurrency(c.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

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
          Ver demonstrativos completos
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este é o relatório financeiro automático mensal, enviado a diretores e
        conselheiros (BRAIN §6.5/§6.6).
      </Text>
    </EmailLayout>
  );
}

MonthlyFinancialReportEmail.PreviewProps = {
  recipientName: "Diretor Antônio Vieira",
  month: 6,
  year: 2026,
  totalRevenue: 84500,
  totalExpense: 61230.4,
  categoryTotals: [
    { categoryName: "Dízimos e ofertas", type: "receita", total: 62000 },
    { categoryName: "Doações designadas", type: "receita", total: 22500 },
    { categoryName: "Folha de pagamento", type: "despesa", total: 38900.4 },
    { categoryName: "Manutenção predial", type: "despesa", total: 22330 },
  ],
  financeiroUrl: "https://financeiro.hebronaseec.com.br/relatorios/2026-06",
} satisfies MonthlyFinancialReportEmailProps;

export default MonthlyFinancialReportEmail;
