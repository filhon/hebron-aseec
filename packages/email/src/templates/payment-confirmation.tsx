import * as React from "react";
import { Button, Hr, Link, Section, Text } from "@react-email/components";
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

export interface PaymentConfirmationEmailProps {
  recipientName: string;
  projectTitle: string;
  /** Valor pago (string decimal do banco, ex: "1500.00") */
  amount: string;
  paymentDate: Date;
  /** Mês de pagamento (1-12, opcional) */
  paymentMonth?: number | null;
  projectUrl: string;
  /** URL do comprovante (signed URL do Supabase Storage, se houver) */
  receiptUrl?: string | null;
}

function formatCurrency(amount: string): string {
  return parseFloat(amount).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function PaymentConfirmationEmail({
  recipientName,
  projectTitle,
  amount,
  paymentDate,
  paymentMonth,
  projectUrl,
  receiptUrl,
}: PaymentConfirmationEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  const paymentDateStr = paymentDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const installmentLabel = paymentMonth
    ? `Pagamento referente ao mês ${paymentMonth}`
    : "Pagamento realizado";

  return (
    <EmailLayout
      preview={`Pagamento de ${formatCurrency(amount)} realizado — ${projectTitle}`}
    >
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: "#16A34A",
          marginBottom: 8,
        }}
      >
        Pagamento realizado
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um pagamento referente ao seu projeto foi processado.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 28,
          borderLeft: "4px solid #16A34A",
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 32,
            fontWeight: "700",
            color: "#16A34A",
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
          }}
        >
          {formatCurrency(amount)}
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 13,
            color: emailColors.muted,
            margin: "0 0 20px",
          }}
        >
          {installmentLabel}
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
                Data
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  color: emailColors.foreground,
                }}
              >
                {paymentDateStr}
              </td>
            </tr>
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
          Ver extrato do projeto
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      {receiptUrl ? (
        <Text style={textSm}>
          O comprovante de pagamento está disponível:{" "}
          <Link
            href={receiptUrl}
            style={{ color: emailColors.primary, wordBreak: "break-all" }}
          >
            Baixar comprovante
          </Link>
        </Text>
      ) : null}

      <Text style={{ ...textSm, margin: 0 }}>
        Este email foi enviado automaticamente após a liberação do pagamento.
        Guarde este registro para sua prestação de contas.
      </Text>
    </EmailLayout>
  );
}

PaymentConfirmationEmail.PreviewProps = {
  recipientName: "Paulo Henrique Souza",
  projectTitle: "Restauração do telhado da capela sede",
  amount: "1500.00",
  paymentDate: new Date("2026-07-10"),
  paymentMonth: 7,
  projectUrl: "https://projetos.hebronaseec.com.br/projetos/55",
  receiptUrl: "https://storage.hebronaseec.com.br/comprovantes/55-07.pdf",
} satisfies PaymentConfirmationEmailProps;

export default PaymentConfirmationEmail;
