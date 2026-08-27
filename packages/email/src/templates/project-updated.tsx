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

export interface ProjectFieldChangeDisplay {
  label: string;
  before: string;
  after: string;
}

export interface ProjectUpdatedEmailProps {
  recipientName: string;
  projectTitle: string;
  changes: ProjectFieldChangeDisplay[];
  projectUrl: string;
}

// P-2.16 CORRETIVO — PRD item 8: "Qualquer alteração no projeto durante as
// etapas de validação devem ser comunicadas ao submissor por e-mail."
// Dispara a cada salvamento de updateProjectInValidation, com o diff
// campo a campo (antes → depois).
export function ProjectUpdatedEmail({
  recipientName,
  projectTitle,
  changes,
  projectUrl,
}: ProjectUpdatedEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <EmailLayout preview={`Alterações no projeto "${projectTitle}"`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Seu projeto foi alterado
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Text style={text}>
        A diretoria da Hebron Aseec alterou informações do projeto{" "}
        <strong>{projectTitle}</strong>, atualmente em validação. Confira o que
        mudou abaixo.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
          borderLeft: `4px solid ${emailColors.primary}`,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {changes.map((c, i) => (
              <tr key={i}>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 12,
                    fontWeight: "600",
                    color: emailColors.muted,
                    width: 140,
                    padding: "6px 8px 6px 0",
                    verticalAlign: "top",
                  }}
                >
                  {c.label}
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    color: emailColors.muted,
                    textDecoration: "line-through",
                    padding: "6px 8px",
                    verticalAlign: "top",
                  }}
                >
                  {c.before}
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    fontWeight: "700",
                    color: emailColors.foreground,
                    padding: "6px 0",
                    verticalAlign: "top",
                  }}
                >
                  {c.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={projectUrl}
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
          Ver projeto
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este é um aviso automático do sistema de projetos da Hebron Aseec. Não
        responda a este email.
      </Text>
    </EmailLayout>
  );
}

ProjectUpdatedEmail.PreviewProps = {
  recipientName: "Paulo Henrique Souza",
  projectTitle: "Restauração do telhado da capela sede",
  changes: [
    { label: "Valor Total (R$)", before: "R$ 45.000", after: "R$ 38.000" },
    { label: "Número de Parcelas", before: "3", after: "2" },
  ],
  projectUrl: "https://projetos.hebronaseec.com.br/55",
} satisfies ProjectUpdatedEmailProps;

export default ProjectUpdatedEmail;
