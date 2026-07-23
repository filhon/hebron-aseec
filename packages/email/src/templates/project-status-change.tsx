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

export type ProjectStatusEvent =
  | "validacao"
  | "votacao_aberta"
  | "aprovado"
  | "reprovado"
  | "bloqueado"
  | "contestacao"
  | "designado";

const STATUS_CONFIG: Record<
  ProjectStatusEvent,
  {
    preview: string;
    heading: string;
    headingColor: string;
    body: (projectTitle: string, extra?: string) => string;
    ctaLabel: string;
    accentColor: string;
  }
> = {
  validacao: {
    preview: "Seu projeto está em análise",
    heading: "Projeto em análise",
    headingColor: emailColors.primary,
    body: (title) =>
      `Seu projeto "${title}" foi recebido e está sendo analisado pela equipe de administração. Você será notificado sobre o resultado.`,
    ctaLabel: "Ver projeto",
    accentColor: emailColors.primary,
  },
  votacao_aberta: {
    preview: "Novo projeto aguarda sua avaliação",
    heading: "Votação aberta",
    headingColor: emailColors.primary,
    body: (title) =>
      `O projeto "${title}" está na fase de votação e aguarda sua participação. Acesse o portal para registrar sua avaliação antes da reunião.`,
    ctaLabel: "Avaliar projeto",
    accentColor: emailColors.primary,
  },
  aprovado: {
    preview: "Seu projeto foi aprovado",
    heading: "Projeto aprovado",
    headingColor: "#16A34A",
    body: (title) =>
      `Temos uma boa notícia: o projeto "${title}" foi aprovado pela diretoria da Hebron Aseec após o período de homologação. Os pagamentos serão processados conforme o cronograma aprovado.`,
    ctaLabel: "Ver detalhes",
    accentColor: "#16A34A",
  },
  reprovado: {
    preview: "Atualização sobre seu projeto",
    heading: "Projeto não aprovado",
    headingColor: "#DC2626",
    body: (title) =>
      `Após análise pela diretoria, o projeto "${title}" não foi aprovado neste ciclo. Entre em contato com a administração para mais informações ou para submeter um novo projeto.`,
    ctaLabel: "Ver detalhes",
    accentColor: "#DC2626",
  },
  bloqueado: {
    preview: "Projeto bloqueado por relatório pendente",
    heading: "Projeto bloqueado",
    headingColor: "#DC2626",
    body: (title, extra) =>
      `O projeto "${title}" foi bloqueado por falta de relatório${extra ? ` (${extra})` : ""}. Os pagamentos estão suspensos até a entrega do relatório pendente.`,
    ctaLabel: "Enviar relatório",
    accentColor: "#DC2626",
  },
  contestacao: {
    preview: "Contestação registrada em projeto homologado",
    heading: "Contestação de projeto",
    headingColor: emailColors.accent,
    body: (title, extra) =>
      `Uma contestação foi registrada para o projeto "${title}"${extra ? ` por ${extra}` : ""}. O projeto retorna para votação. Acesse o portal para participar.`,
    ctaLabel: "Ver contestação",
    accentColor: emailColors.accent,
  },
  designado: {
    preview: "Projetos designados para sua avaliação",
    heading: "Projetos para avaliação",
    headingColor: emailColors.primary,
    body: (title) =>
      `Você foi designado para avaliar o projeto "${title}". A reunião de votação ocorrerá em 7 dias. Acesse o portal para revisar os projetos designados com antecedência.`,
    ctaLabel: "Ver projetos designados",
    accentColor: emailColors.primary,
  },
};

export interface ProjectStatusChangeEmailProps {
  recipientName: string;
  projectTitle: string;
  statusEvent: ProjectStatusEvent;
  projectUrl: string;
  /** Informação adicional contextual (ex: nome do contestador, prazo do relatório) */
  extra?: string | null;
}

export function ProjectStatusChangeEmail({
  recipientName,
  projectTitle,
  statusEvent,
  projectUrl,
  extra,
}: ProjectStatusChangeEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const config = STATUS_CONFIG[statusEvent];

  return (
    <EmailLayout preview={config.preview}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: config.headingColor,
          marginBottom: 8,
        }}
      >
        {config.heading}
      </Text>

      <Text style={text}>Olá, {firstName}.</Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
          borderLeft: `4px solid ${config.accentColor}`,
        }}
      >
        <Text
          style={{
            fontFamily: emailFontFamily,
            fontSize: 14,
            color: emailColors.foreground,
            margin: 0,
            lineHeight: "1.6",
          }}
        >
          {config.body(projectTitle, extra ?? undefined)}
        </Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={projectUrl}
          style={{
            backgroundColor: config.accentColor,
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
          {config.ctaLabel}
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

ProjectStatusChangeEmail.PreviewProps = {
  recipientName: "Paulo Henrique Souza",
  projectTitle: "Restauração do telhado da capela sede",
  statusEvent: "aprovado",
  projectUrl: "https://projetos.hebronaseec.com.br/projetos/55",
  extra: null,
} satisfies ProjectStatusChangeEmailProps;

export default ProjectStatusChangeEmail;
