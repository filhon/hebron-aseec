import * as React from "react";
import { Button, Hr, Link, Section, Text } from "@react-email/components";
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

export interface LegacyAccessEmailProps {
  /** Magic link (Supabase `generateLink({ type: "magiclink" })`) */
  accessUrl: string;
  /** Nome do usuário (opcional) */
  name?: string;
}

export function LegacyAccessEmail({ accessUrl, name }: LegacyAccessEmailProps) {
  const firstName = name ? (name.split(" ")[0] ?? name) : null;
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";

  return (
    <EmailLayout preview="Sua conta foi migrada para o novo sistema Hebron Aseec.">
      <Text style={text}>{greeting},</Text>

      <Text style={text}>
        Sua conta foi migrada para o novo sistema da{" "}
        <strong>Hebron Aseec</strong>. Não é preciso criar senha nem cadastro
        novo — clique no botão abaixo para acessar diretamente.
      </Text>

      <Section style={{ textAlign: "center", margin: "28px 0" }}>
        <Button
          href={accessUrl}
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
          Acessar minha conta
        </Button>
      </Section>

      <Section
        style={{
          background: "#FFF7ED",
          border: `1px solid #FED7AA`,
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 13,
            color: "#92400E",
            margin: 0,
            lineHeight: "1.5",
          }}
        >
          Este link é de uso único e expira em pouco tempo. Se ele já não
          funcionar quando você clicar, volte à tela de login e entre com seu
          e-mail — nós enviamos um novo link de acesso automaticamente.
        </Text>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Ou copie e cole o link no seu navegador:{" "}
        <Link
          href={accessUrl}
          style={{ color: emailColors.primary, wordBreak: "break-all" }}
        >
          {accessUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

LegacyAccessEmail.PreviewProps = {
  accessUrl: "https://app.hebronaseec.com.br/post-login?token=xyz789",
  name: "Marcos Andrade",
} satisfies LegacyAccessEmailProps;

export default LegacyAccessEmail;
