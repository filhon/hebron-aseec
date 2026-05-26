import * as React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  emailColors,
  emailFontFamily,
} from "../components/layout";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  diretor: "Diretor",
  conselheiro: "Conselheiro",
  colaborador: "Colaborador",
  submissor: "Submissor",
  aluno: "Aluno",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

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

export interface WelcomeEmailProps {
  /** Nome completo do novo usuário */
  name: string;
  /** Papéis atribuídos */
  roles: string[];
  /** URL de login na plataforma */
  loginUrl: string;
}

export function WelcomeEmail({ name, roles, loginUrl }: WelcomeEmailProps) {
  const rolesText = roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
  const firstName = name.split(" ")[0] ?? name;

  return (
    <EmailLayout
      preview={`Bem-vindo(a) à Hebron Aseec, ${firstName}. Sua conta está pronta.`}
    >
      {/* Saudação */}
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Bem-vindo(a), {firstName}.
      </Text>

      <Text style={text}>
        Sua conta na plataforma <strong>Hebron Aseec</strong> foi ativada com
        sucesso. Você já pode acessar os recursos disponíveis para o seu perfil.
      </Text>

      {/* Acesso concedido */}
      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 28,
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 11,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: emailColors.muted,
            margin: "0 0 4px",
          }}
        >
          Acesso concedido
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 15,
            fontWeight: "700",
            color: emailColors.accent,
            margin: 0,
          }}
        >
          {rolesText}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={loginUrl}
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
          Acessar plataforma
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Se tiver dificuldades para acessar, entre em contato com a administração
        da Hebron Aseec.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
