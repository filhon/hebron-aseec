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

export interface UrgentAnnouncementEmailProps {
  recipientName: string;
  title: string;
  body: string;
  authorName: string;
  publishedAt: Date;
  intranetUrl: string;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UrgentAnnouncementEmail({
  recipientName,
  title,
  body,
  authorName,
  publishedAt,
  intranetUrl,
}: UrgentAnnouncementEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout preview={`Anúncio urgente: ${title}`}>
      <Section style={{ marginBottom: 8 }}>
        <table cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: "0.6px",
                  color: "#ffffff",
                  backgroundColor: emailColors.accent,
                  borderRadius: 4,
                  padding: "4px 10px",
                  textTransform: "uppercase",
                }}
              >
                Anúncio urgente
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          borderLeft: `3px solid ${emailColors.accent}`,
          padding: "18px 22px",
          marginBottom: 20,
        }}
      >
        <Text style={{ ...text, margin: 0, whiteSpace: "pre-wrap" }}>
          {body}
        </Text>
      </Section>

      <Text style={{ ...textSm, margin: "0 0 24px" }}>
        Publicado por {authorName} em {formatDateTime(publishedAt)}.
      </Text>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={intranetUrl}
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
          Ver anúncio na intranet
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este é um anúncio urgente enviado a toda a equipe interna. Por ser
        comunicação operacional, este email não está sujeito a preferências de
        notificação.
      </Text>
    </EmailLayout>
  );
}

UrgentAnnouncementEmail.PreviewProps = {
  recipientName: "Marcos Andrade",
  title: "Manutenção programada do sistema neste sábado",
  body: "No próximo sábado, das 6h às 8h, os sistemas da Hebron Aseec ficarão indisponíveis para manutenção programada. Planeje eventuais acessos fora desse período.",
  authorName: "Equipe de TI",
  publishedAt: new Date("2026-07-22T14:30:00-03:00"),
  intranetUrl: "https://app.hebronaseec.com.br/anuncios",
} satisfies UrgentAnnouncementEmailProps;

export default UrgentAnnouncementEmail;
