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
// Um único template cobre "aprovada" e "rejeitada" (BRAIN §6.8: decisão do
// gestor tem só esses 2 desfechos possíveis para quem solicitou) — mesmo
// padrão polimórfico de ProjectStatusChangeEmail (project-status-change.tsx).
// ---------------------------------------------------------------------------

export type ReservationDecision = "aprovada" | "rejeitada";

export interface ReservationApprovedEmailProps {
  recipientName: string;
  decision: ReservationDecision;
  unitName?: string | null;
  period?: { start: Date; end: Date } | null;
  managerNotes?: string | null;
  reservationUrl: string;
}

export function ReservationApprovedEmail({
  recipientName,
  decision,
  unitName,
  period,
  managerNotes,
  reservationUrl,
}: ReservationApprovedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const approved = decision === "aprovada";
  const accentColor = approved ? "#16A34A" : "#DC2626";

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <EmailLayout
      preview={
        approved
          ? "Sua reserva de flat foi aprovada"
          : "Atualização sobre sua solicitação de flat"
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
        {approved ? "Reserva aprovada" : "Reserva não aprovada"}
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      {approved ? (
        <>
          <Text style={text}>
            Sua solicitação de hospedagem nos flats da Hebron Aseec foi
            aprovada. Confira abaixo a unidade e o período confirmados.
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
                    {unitName ?? "—"}
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
                    Período
                  </td>
                  <td
                    style={{
                      fontFamily: emailFontFamily,
                      fontSize: 13,
                      fontWeight: "700",
                      color: accentColor,
                    }}
                  >
                    {period ? `${fmt(period.start)} a ${fmt(period.end)}` : "—"}
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
            Próximos passos
          </Text>

          <Text style={{ ...textSm, marginBottom: 20 }}>
            O check-in é presencial, na recepção do condomínio — você receberá
            as instruções completas por email 3 dias antes da data de chegada.{" "}
            {managerNotes ? `Observação do gestor: ${managerNotes}` : ""}
          </Text>
        </>
      ) : (
        <>
          <Text style={text}>
            Após análise, sua solicitação de hospedagem nos flats da Hebron
            Aseec não foi aprovada neste momento.
          </Text>

          <Section
            style={{
              background: emailColors.surface,
              borderRadius: 8,
              padding: "16px 20px",
              marginBottom: 28,
              borderLeft: `4px solid ${accentColor}`,
            }}
          >
            <Text
              style={{
                fontFamily: emailFontFamily,
                fontSize: 12,
                fontWeight: "600",
                color: emailColors.muted,
                margin: "0 0 6px",
              }}
            >
              Motivo
            </Text>
            <Text
              style={{
                fontFamily: emailFontFamily,
                fontSize: 14,
                color: emailColors.foreground,
                margin: 0,
                lineHeight: "1.6",
              }}
            >
              {managerNotes ?? "Nenhum motivo adicional foi registrado."}
            </Text>
          </Section>
        </>
      )}

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
          Ver detalhes da reserva
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

ReservationApprovedEmail.PreviewProps = {
  recipientName: "Fernanda Costa",
  decision: "aprovada",
  unitName: "Flat 302",
  period: { start: new Date("2026-07-27"), end: new Date("2026-07-30") },
  managerNotes: "Chegada após 22h, avisar a recepção com antecedência.",
  reservationUrl: "https://flats.hebronaseec.com.br/reservas/88",
} satisfies ReservationApprovedEmailProps;

export default ReservationApprovedEmail;
