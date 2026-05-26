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

export interface PasswordResetEmailProps {
  /** URL para redefinição de senha */
  resetUrl: string;
  /** Nome do usuário (opcional) */
  name?: string;
  /** Validade do link em horas (padrão: 24) */
  expiresInHours?: number;
}

export function PasswordResetEmail({
  resetUrl,
  name,
  expiresInHours = 24,
}: PasswordResetEmailProps) {
  const firstName = name ? (name.split(" ")[0] ?? name) : null;
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";

  return (
    <EmailLayout preview="Redefinição de senha — link válido por tempo limitado.">
      <Text style={text}>{greeting},</Text>

      <Text style={text}>
        Recebemos uma solicitação para redefinir a senha da sua conta na
        plataforma <strong>Hebron Aseec</strong>.
      </Text>

      <Text style={text}>
        Clique no botão abaixo para criar uma nova senha. Este link é válido por{" "}
        <strong>
          {expiresInHours} hora{expiresInHours !== 1 ? "s" : ""}
        </strong>
        .
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: "center", margin: "28px 0" }}>
        <Button
          href={resetUrl}
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
          Redefinir senha
        </Button>
      </Section>

      {/* Aviso de segurança */}
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
          Se você não fez esta solicitação, ignore este e-mail. Sua senha
          permanece inalterada e nenhuma ação é necessária.
        </Text>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Ou copie e cole o link no seu navegador:{" "}
        <Link
          href={resetUrl}
          style={{ color: emailColors.primary, wordBreak: "break-all" }}
        >
          {resetUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
