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

export interface NewVersionEmailProps {
  recipientName: string;
  documentTitle: string;
  categoryName: string;
  documentUrl: string;
  versionNumber: number;
  summary?: string | null;
}

export function NewVersionEmail({
  recipientName,
  documentTitle,
  categoryName,
  documentUrl,
  versionNumber,
  summary,
}: NewVersionEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout
      preview={`Nova versão disponível em ${categoryName}: ${documentTitle}`}
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
        Documento revisado
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um documento que você acompanha em{" "}
        <strong>{categoryName}</strong> recebeu uma nova versão.
      </Text>

      {/* Document info */}
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
          {categoryName} · versão {versionNumber}
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: summary ? "0 0 10px" : 0,
          }}
        >
          {documentTitle}
        </Text>
        {summary && (
          <Text
            style={{
              fontFamily: emailFontFamily,
              fontSize: 13,
              lineHeight: "1.5",
              color: emailColors.foreground,
              margin: 0,
            }}
          >
            {summary}
          </Text>
        )}
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={documentUrl}
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
          Ver versão atual
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Você recebeu este email por estar inscrito na categoria{" "}
        <strong>{categoryName}</strong>. Para gerenciar suas inscrições, acesse
        o portal de documentos da Hebron Aseec.
      </Text>
    </EmailLayout>
  );
}

NewVersionEmail.PreviewProps = {
  recipientName: "Marcos Andrade",
  documentTitle: "Política de Privacidade e Proteção de Dados",
  categoryName: "Políticas institucionais",
  documentUrl: "https://docs.hebronaseec.com.br/politica-de-privacidade",
  versionNumber: 3,
  summary: "Atualização da seção 4 com o novo prazo de retenção de dados.",
} satisfies NewVersionEmailProps;

export default NewVersionEmail;
