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

export interface BriefingKpi {
  label: string;
  value: string;
}

export interface BriefingEvent {
  label: string;
  detail: string;
}

export interface BriefingEmailProps {
  recipientName: string;
  /** "diario" | "semanal" — só afeta o texto de abertura */
  frequency: "diario" | "semanal";
  /** Ex.: "10 de julho de 2026" (diário) ou "6 a 12 de julho de 2026" (semanal) */
  periodLabel: string;
  kpis: BriefingKpi[];
  recentAnnouncements: BriefingEvent[];
  recentMeetingDecisions: BriefingEvent[];
  intranetUrl: string;
}

export function BriefingEmail({
  recipientName,
  frequency,
  periodLabel,
  kpis,
  recentAnnouncements,
  recentMeetingDecisions,
  intranetUrl,
}: BriefingEmailProps) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const cadenceLabel = frequency === "diario" ? "diário" : "semanal";
  const hasEvents =
    recentAnnouncements.length > 0 || recentMeetingDecisions.length > 0;

  return (
    <EmailLayout preview={`Seu briefing ${cadenceLabel} — ${periodLabel}`}>
      <Text
        style={{
          ...text,
          fontSize: 22,
          fontWeight: "700",
          color: emailColors.primary,
          marginBottom: 8,
        }}
      >
        Briefing {cadenceLabel}
      </Text>

      <Text style={text}>
        Olá, {firstName}. Aqui está o resumo de <strong>{periodLabel}</strong>{" "}
        para projetos, tarefas e financeiro.
      </Text>

      <Section
        style={{
          background: emailColors.surface,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 20,
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {kpis.map((kpi, i) => (
              <tr key={kpi.label}>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 12,
                    fontWeight: "600",
                    color: emailColors.muted,
                    width: 180,
                    paddingBottom: i === kpis.length - 1 ? 0 : 6,
                  }}
                >
                  {kpi.label}
                </td>
                <td
                  style={{
                    fontFamily: emailFontFamily,
                    fontSize: 13,
                    fontWeight: "700",
                    color: emailColors.primary,
                    paddingBottom: i === kpis.length - 1 ? 0 : 6,
                  }}
                >
                  {kpi.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {hasEvents && (
        <Section style={{ marginBottom: 28 }}>
          <Text
            style={{
              ...textSm,
              fontWeight: "700",
              color: emailColors.foreground,
              margin: "0 0 8px",
            }}
          >
            Últimos eventos
          </Text>
          <table width="100%" cellPadding={0} cellSpacing={0}>
            <tbody>
              {[...recentAnnouncements, ...recentMeetingDecisions].map(
                (event, i) => (
                  <tr key={`${event.label}-${i}`}>
                    <td
                      style={{
                        fontFamily: emailFontFamily,
                        fontSize: 13,
                        color: emailColors.foreground,
                        padding: "6px 0",
                        borderBottom: `1px solid ${emailColors.border}`,
                      }}
                    >
                      <strong>{event.label}</strong>
                      <br />
                      <span style={{ color: emailColors.muted }}>
                        {event.detail}
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </Section>
      )}

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button
          href={intranetUrl}
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
          Ver painel da intranet
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        Este é o seu briefing {cadenceLabel} automático, enviado porque você
        optou por recebê-lo em Configurações → Briefing. Para alterar a
        frequência ou desativar, acesse a intranet.
      </Text>
    </EmailLayout>
  );
}

export default BriefingEmail;
