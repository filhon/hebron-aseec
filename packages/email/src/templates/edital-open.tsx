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

export interface EditalOpenEmailProps {
  recipientName: string;
  editalTitle: string;
  editalUrl: string;
  opensAt: Date;
  closesAt: Date | null;
  projectType?: string | null;
}

export function EditalOpenEmail({
  recipientName,
  editalTitle,
  editalUrl,
  opensAt,
  closesAt,
  projectType,
}: EditalOpenEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <EmailLayout preview={`Edital aberto para submissões: ${editalTitle}`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.accent,
          marginBottom: 8,
        }}
      >
        Edital aberto para submissões
      </Text>

      <Text style={text}>
        Olá, {firstName}. Um novo edital está disponível para submissão de
        projetos na <strong>Hebron Aseec</strong>.
      </Text>

      {/* Edital info */}
      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 28,
          borderLeft: `4px solid ${emailColors.accent}`,
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: emailColors.foreground,
            margin: "0 0 12px",
          }}
        >
          {editalTitle}
        </Text>

        {projectType && (
          <table
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{ marginBottom: 8 }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 12,
                    fontWeight: "600",
                    color: emailColors.muted,
                    width: 140,
                    paddingBottom: 4,
                  }}
                >
                  Tipo de projeto
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    color: emailColors.foreground,
                    paddingBottom: 4,
                  }}
                >
                  {projectType}
                </td>
              </tr>
            </tbody>
          </table>
        )}

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
                  paddingBottom: 4,
                }}
              >
                Abertura
              </td>
              <td
                style={{
                  fontFamily: emailFontFamily,
                  fontSize: 13,
                  color: emailColors.foreground,
                  paddingBottom: 4,
                }}
              >
                {formatDate(opensAt)}
              </td>
            </tr>
            {closesAt && (
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
                  Encerramento
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    color: emailColors.foreground,
                  }}
                >
                  {formatDate(closesAt)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={editalUrl}
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
          Ver edital completo
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este email foi enviado a todos os submissores ativos da Hebron Aseec.
        Para mais informações, acesse o portal de documentos ou entre em contato
        com a administração.
      </Text>
    </EmailLayout>
  );
}

EditalOpenEmail.PreviewProps = {
  recipientName: "Paulo Henrique Souza",
  editalTitle: "Edital de Projetos Missionários 2026/2",
  editalUrl: "https://projetos.hebronaseec.com.br/editais/12",
  opensAt: new Date("2026-07-01"),
  closesAt: new Date("2026-08-01"),
  projectType: "Pontual",
} satisfies EditalOpenEmailProps;

export default EditalOpenEmail;
