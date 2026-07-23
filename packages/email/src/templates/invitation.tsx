import * as React from "react";
import { Button, Hr, Link, Section, Text } from "@react-email/components";
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

export interface InvitationEmailProps {
  /** URL de aceitação do convite */
  inviteUrl: string;
  /** Papéis atribuídos ao convidado */
  roles: string[];
  /** Mensagem personalizada do administrador (opcional) */
  message?: string;
  /** Data de expiração do convite */
  expiresAt: Date;
  /** Nome de quem enviou o convite (opcional) */
  inviterName?: string;
}

export function InvitationEmail({
  inviteUrl,
  roles,
  message,
  expiresAt,
  inviterName,
}: InvitationEmailProps) {
  const rolesText = roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
  const expiryText = expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <EmailLayout preview="Você recebeu um convite para a plataforma Hebron Aseec.">
      <Text style={text}>Olá,</Text>

      {inviterName ? (
        <Text style={text}>
          <strong>{inviterName}</strong> convidou você para acessar a plataforma{" "}
          <strong>Hebron Aseec</strong>.
        </Text>
      ) : (
        <Text style={text}>
          Você foi convidado para acessar a plataforma{" "}
          <strong>Hebron Aseec</strong>.
        </Text>
      )}

      {/* Mensagem personalizada */}
      {message && (
        <Section
          style={{
            borderLeft: `3px solid ${emailColors.accent}`,
            paddingLeft: 14,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              ...text,
              color: emailColors.muted,
              fontStyle: "italic",
              margin: 0,
            }}
          >
            "{message}"
          </Text>
        </Section>
      )}

      {/* Papel(éis) */}
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
          Papel(éis) atribuído(s)
        </Text>
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 15,
            fontWeight: "700",
            color: emailColors.primary,
            margin: 0,
          }}
        >
          {rolesText}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={inviteUrl}
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
          Aceitar convite
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={textSm}>
        Este convite expira em <strong>{expiryText}</strong>. Se você não
        esperava este convite, pode ignorar este e-mail com segurança.
      </Text>

      <Text style={{ ...textSm, margin: 0 }}>
        Ou acesse diretamente:{" "}
        <Link
          href={inviteUrl}
          style={{ color: emailColors.primary, wordBreak: "break-all" }}
        >
          {inviteUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  inviteUrl: "https://app.hebronaseec.com.br/convite/abc123",
  roles: ["colaborador", "submissor"],
  message: "Seja bem-vindo(a) à equipe. Qualquer dúvida, me chame.",
  expiresAt: new Date("2026-08-06"),
  inviterName: "Roberto Almeida",
} satisfies InvitationEmailProps;

export default InvitationEmail;
