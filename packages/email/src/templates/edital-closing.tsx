import * as React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  emailColors,
  emailFontFamily,
} from "../components/layout";

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export interface EditalClosingEmailProps {
  recipientName: string;
  editalTitle: string;
  editalUrl: string;
  closesAt: Date;
  daysUntilClose: number;
}

export function EditalClosingEmail({
  recipientName,
  editalTitle,
  editalUrl,
  closesAt,
  daysUntilClose,
}: EditalClosingEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  const closingDateText = closesAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const closingTimeText = closesAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const dayLabel = daysUntilClose === 1 ? "1 dia" : `${daysUntilClose} dias`;

  return (
    <EmailLayout
      preview={`Lembrete: o edital "${editalTitle}" encerra em ${dayLabel}`}
    >
      {/* Urgency badge */}
      <Section style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: emailColors.accent,
            margin: 0,
            display: "inline-block",
            border: `1.5px solid ${emailColors.accent}`,
            borderRadius: 4,
            padding: "3px 10px",
          }}
        >
          Prazo se aproximando — {dayLabel}
        </Text>
      </Section>

      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.foreground,
          marginBottom: 8,
        }}
      >
        Lembrete de encerramento
      </Text>

      <Text style={text}>
        Olá, {firstName}. O prazo de submissão do edital abaixo encerra em{" "}
        <strong>{dayLabel}</strong>. Se você ainda não enviou sua proposta, este
        é o momento de agir.
      </Text>

      {/* Edital info */}
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
            margin: "0 0 12px",
          }}
        >
          {editalTitle}
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
                  paddingBottom: 4,
                }}
              >
                Encerramento
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "600",
                  color: emailColors.accent,
                  paddingBottom: 4,
                }}
              >
                {closingDateText} às {closingTimeText}
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
                }}
              >
                Restam
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.accent,
                }}
              >
                {dayLabel}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={editalUrl}
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
          Acessar edital
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este lembrete foi enviado automaticamente a todos os submissores ativos
        da Hebron Aseec. Submissões recebidas após o prazo não serão
        consideradas.
      </Text>
    </EmailLayout>
  );
}

EditalClosingEmail.PreviewProps = {
  recipientName: "Paulo Henrique Souza",
  editalTitle: "Edital de Projetos Missionários 2026/2",
  editalUrl: "https://projetos.hebronaseec.com.br/editais/12",
  closesAt: new Date("2026-08-01T18:00:00-03:00"),
  daysUntilClose: 3,
} satisfies EditalClosingEmailProps;

export default EditalClosingEmail;
