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

// ---------------------------------------------------------------------------
// Um único template cobre as 2 lembretes automáticos da estadia (cron,
// packages/jobs/src/crons/flats.ts): "checkin" (3 dias antes, com todas as
// instruções) e "checkout" (no dia da saída, lembrete simples) — mesmo
// padrão polimórfico de ReportReminderEmail (report-reminder.tsx). Check-in
// é sempre presencial na recepção do condomínio (BRAIN §6.8: sem smart
// locks/check-in autônomo na v1).
// ---------------------------------------------------------------------------

export type CheckinInstructionsType = "checkin" | "checkout";

export interface CheckinInstructionsEmailProps {
  recipientName: string;
  type: CheckinInstructionsType;
  unitName: string;
  /** Descrição/observações da unidade (flats.units.description) — usada como instrução adicional, quando existir. */
  instructions?: string | null;
  period: { start: Date; end: Date };
  reservationUrl: string;
}

export function CheckinInstructionsEmail({
  recipientName,
  type,
  unitName,
  instructions,
  period,
  reservationUrl,
}: CheckinInstructionsEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const isCheckin = type === "checkin";
  const accentColor = emailColors.primary;

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <EmailLayout
      preview={
        isCheckin
          ? `Faltam 3 dias para sua estadia em ${unitName}`
          : `Hoje é o dia da sua saída de ${unitName}`
      }
    >
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: accentColor,
          marginBottom: 8,
        }}
      >
        {isCheckin ? "Sua estadia se aproxima" : "Dia da saída"}
      </Text>

      <Text style={text}>
        Olá, {firstName}.{" "}
        {isCheckin
          ? `Faltam 3 dias para o início da sua hospedagem em ${unitName}. Confira as instruções de check-in abaixo.`
          : `Hoje é o dia previsto para a saída de ${unitName}. Este é um lembrete das instruções de check-out.`}
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
          borderLeft: `4px solid ${accentColor}`,
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
                }}
              >
                Unidade
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
                {unitName}
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
                {isCheckin ? "Chegada" : "Saída"}
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  fontWeight: "700",
                  color: accentColor,
                }}
              >
                {isCheckin ? fmt(period.start) : fmt(period.end)}
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
        {isCheckin ? "Instruções de check-in" : "Instruções de check-out"}
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <Text style={{ ...textSm, margin: "0 0 8px" }}>
          {isCheckin
            ? "O check-in é presencial, na recepção do condomínio — apresente-se com um documento de identificação para todos os hóspedes acima de 3 anos."
            : "Deixe a unidade organizada e entregue as chaves na recepção do condomínio até o horário combinado com o gestor."}
        </Text>
        {instructions ? (
          <Text style={{ ...textSm, margin: 0 }}>{instructions}</Text>
        ) : null}
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={reservationUrl}
          style={{
            backgroundColor: accentColor,
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
          Ver minha reserva
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este é um lembrete automático do sistema de flats da Hebron Aseec. Não
        responda a este email.
      </Text>
    </EmailLayout>
  );
}

CheckinInstructionsEmail.PreviewProps = {
  recipientName: "Fernanda Costa",
  type: "checkin",
  unitName: "Flat 302",
  instructions: "Portão eletrônico com senha 2026, informada pela recepção.",
  period: { start: new Date("2026-07-27"), end: new Date("2026-07-30") },
  reservationUrl: "https://flats.hebronaseec.com.br/reservas/88",
} satisfies CheckinInstructionsEmailProps;

export default CheckinInstructionsEmail;
