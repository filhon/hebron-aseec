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

export interface ReservationSubmittedPeriod {
  rank: number;
  start: Date;
  end: Date;
}

export interface ReservationSubmittedEmailProps {
  recipientName: string;
  guestName: string;
  purpose: string;
  scoreTotal: number;
  periods: ReservationSubmittedPeriod[];
  reservationUrl: string;
}

export function ReservationSubmittedEmail({
  recipientName,
  guestName,
  purpose,
  scoreTotal,
  periods,
  reservationUrl,
}: ReservationSubmittedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <EmailLayout
      preview={`Nova solicitação de flat de ${guestName} — aguarda sua análise`}
    >
      <Section style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: emailColors.primary,
            margin: 0,
            display: "inline-block",
            border: `1.5px solid ${emailColors.primary}`,
            borderRadius: 4,
            padding: "3px 10px",
          }}
        >
          Nova solicitação de flat
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
        Reserva aguardando análise
      </Text>

      <Text style={text}>
        Olá, {firstName}. <strong>{guestName}</strong> solicitou hospedagem nos
        flats da Hebron Aseec. Confira o motivo, a pontuação e os períodos de
        preferência abaixo antes de aprovar ou rejeitar.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
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
                  width: 140,
                  paddingBottom: 6,
                  verticalAlign: "top",
                }}
              >
                Motivo
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  color: emailColors.foreground,
                  paddingBottom: 6,
                }}
              >
                {purpose}
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
                Pontuação
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: emailColors.primary,
                }}
              >
                {scoreTotal} / 75 pontos
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text
        style={{
          fontFamily: emailFontFamily,
          fontSize: 13,
          fontWeight: "700",
          color: emailColors.foreground,
          margin: "0 0 8px",
        }}
      >
        Períodos de preferência
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "12px 20px",
          marginBottom: 28,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {periods.map((p) => (
              <tr key={p.rank}>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 12,
                    fontWeight: "600",
                    color: emailColors.muted,
                    width: 60,
                    padding: "6px 0",
                  }}
                >
                  {p.rank}ª opção
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    color: emailColors.foreground,
                    padding: "6px 0",
                  }}
                >
                  {fmt(p.start)} a {fmt(p.end)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={reservationUrl}
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
          Analisar solicitação
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este é um aviso automático do sistema de flats da Hebron Aseec. Não
        responda a este email.
      </Text>
    </EmailLayout>
  );
}

export default ReservationSubmittedEmail;
