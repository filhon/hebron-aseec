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

export interface CertificateIssuedEmailProps {
  recipientName: string;
  courseTitle: string;
  issuedAt: Date;
  certificatesUrl: string;
}

export function CertificateIssuedEmail({
  recipientName,
  courseTitle,
  issuedAt,
  certificatesUrl,
}: CertificateIssuedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const issuedDateText = issuedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <EmailLayout preview={`Certificado emitido: ${courseTitle}`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Parabéns, {firstName}!
      </Text>

      <Text style={text}>
        Você concluiu integralmente o curso{" "}
        <strong>&ldquo;{courseTitle}&rdquo;</strong> e seu certificado já está
        disponível.
      </Text>

      {/* Certificado info */}
      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.primary}`,
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 11,
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: emailColors.muted,
            margin: "0 0 6px",
          }}
        >
          Certificado de conclusão
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: "0 0 6px",
          }}
        >
          {courseTitle}
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 12,
            color: emailColors.muted,
            margin: 0,
          }}
        >
          Emitido em {issuedDateText}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={certificatesUrl}
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
          Ver certificado
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Você recebeu este email por ter concluído este curso na plataforma de
        ensino da Hebron Aseec.
      </Text>
    </EmailLayout>
  );
}

export default CertificateIssuedEmail;
