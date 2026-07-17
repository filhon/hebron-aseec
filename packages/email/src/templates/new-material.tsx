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

export interface NewMaterialEmailProps {
  recipientName: string;
  materialTitle: string;
  materialDescription?: string | null;
  materialUrl: string;
}

export function NewMaterialEmail({
  recipientName,
  materialTitle,
  materialDescription,
  materialUrl,
}: NewMaterialEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout
      preview={`Novo material exclusivo disponível: ${materialTitle}`}
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
        Novo material exclusivo disponível
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um novo material exclusivo foi disponibilizado na
        Rádio Hebron Aseec.
      </Text>

      {/* Material info */}
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
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: materialDescription ? "0 0 6px" : 0,
          }}
        >
          {materialTitle}
        </Text>
        {materialDescription ? (
          <Text
            style={{
              fontFamily: emailFontFamily,
              fontSize: 13,
              color: emailColors.muted,
              margin: 0,
            }}
          >
            {materialDescription}
          </Text>
        ) : null}
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={materialUrl}
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
          Acessar material
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Você recebeu este email por ter aceitado o termo de uso dos materiais
        exclusivos e optado por receber comunicações de novidades. Para
        gerenciar suas preferências, acesse "Meus Dados" na Intranet.
      </Text>
    </EmailLayout>
  );
}

export default NewMaterialEmail;
