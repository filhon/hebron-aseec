import * as React from "react";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  announcements,
  briefingPreferences,
  kpiSnapshots,
  meetingDecisions,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { BriefingEmail } from "@hebron/email/templates/briefing";
import type {
  BriefingEvent,
  BriefingKpi,
} from "@hebron/email/templates/briefing";
import { inngest } from "../client";
import { getDbTemplate, applyVars } from "../lib/templates";

// Briefing diário/semanal (intranet.briefing_preferences) — P-5.10. KPIs lidos
// de intranet.kpi_snapshots (cache horário escrito por
// packages/jobs/src/crons/intranet.ts::runKpiSnapshot) em vez de recomputados
// ao vivo pela 3ª vez (já duplicado entre apps/intranet/src/actions/kpis.ts e
// crons/intranet.ts — ler o snapshot evita uma 4ª cópia das mesmas queries).
// "Relatório financeiro mensal" continua fora daqui: é o cron de P-3.10
// (financeiro.ts::monthlyReportCron), não duplicado neste arquivo.

const INTRANET_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

// ---------------------------------------------------------------------------
// KPIs e eventos recentes são listas de tamanho variável — não dá para
// representá-los com um {{var}} escalar como o resto do template. Renderiza
// cada lista como um fragmento HTML e injeta via applyVars nos placeholders
// {{kpis}}/{{eventos}} do texto salvo no Admin (mesma técnica de string
// replace de applyVars, sem escapar — consistente com o resto do módulo:
// valores já formatados, nunca HTML de terceiros).
// ---------------------------------------------------------------------------

function renderKpisHtml(kpis: BriefingKpi[]): string {
  return kpis
    .map((kpi, i) => {
      const paddingBottom = i === kpis.length - 1 ? 0 : 6;
      return `<tr><td style="font-size:12px;font-weight:600;color:#6B7280;width:180px;padding-bottom:${paddingBottom}px;">${kpi.label}</td><td style="font-size:13px;font-weight:700;color:#202C85;padding-bottom:${paddingBottom}px;">${kpi.value}</td></tr>`;
    })
    .join("");
}

function renderEventsHtml(events: BriefingEvent[]): string {
  if (!events.length) return "";
  const rows = events
    .map(
      (e) =>
        `<tr><td style="font-size:13px;color:#131737;padding:6px 0;border-bottom:1px solid #DCDFEA;"><strong>${e.label}</strong><br/><span style="color:#6B7280;">${e.detail}</span></td></tr>`,
    )
    .join("");
  return `<p style="font-size:13px;font-weight:700;color:#131737;margin:20px 0 8px;">Últimos eventos</p><table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

async function getKpis(): Promise<BriefingKpi[]> {
  const rows = await db
    .select({ metricName: kpiSnapshots.metricName, value: kpiSnapshots.value })
    .from(kpiSnapshots)
    .where(eq(kpiSnapshots.period, currentPeriodKey()));

  const byMetric = new Map(rows.map((r) => [r.metricName, Number(r.value)]));

  return [
    {
      label: "Projetos ativos",
      value: String(byMetric.get("projetos_ativos") ?? 0),
    },
    {
      label: "Doações do mês",
      value: formatCurrency(byMetric.get("doacoes_mes") ?? 0),
    },
    {
      label: "Tarefas abertas",
      value: String(byMetric.get("tarefas_abertas") ?? 0),
    },
  ];
}

async function getRecentEvents(): Promise<{
  recentAnnouncements: BriefingEvent[];
  recentMeetingDecisions: BriefingEvent[];
}> {
  const recentAnnouncementRows = await db
    .select({
      title: announcements.title,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .orderBy(desc(announcements.publishedAt))
    .limit(5);

  const recentDecisionRows = await db
    .select({
      description: meetingDecisions.description,
      createdAt: meetingDecisions.createdAt,
    })
    .from(meetingDecisions)
    .orderBy(desc(meetingDecisions.createdAt))
    .limit(5);

  return {
    recentAnnouncements: recentAnnouncementRows.map((a) => ({
      label: `Anúncio: ${a.title}`,
      detail: a.publishedAt
        ? a.publishedAt.toLocaleDateString("pt-BR")
        : "Não publicado",
    })),
    recentMeetingDecisions: recentDecisionRows.map((d) => ({
      label: "Decisão de reunião",
      detail: d.description,
    })),
  };
}

function periodLabel(frequency: "diario" | "semanal", today: Date): string {
  if (frequency === "diario") {
    return today.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  return `${weekAgo.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} a ${today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`;
}

// Briefing semanal sai às segundas-feiras — o cron roda todo dia (7h), mas só
// os usuários com frequency = "semanal" recebem quando isWeeklyRunDay é true.
function isWeeklyRunDay(today: Date): boolean {
  return today.getUTCDay() === 1;
}

export async function runBriefing(
  options: { today?: Date } = {},
): Promise<{ sent: number }> {
  const today = options.today ?? new Date();
  const frequencies: Array<"diario" | "semanal"> = isWeeklyRunDay(today)
    ? ["diario", "semanal"]
    : ["diario"];

  const recipientRows = await db
    .select({
      userId: briefingPreferences.userId,
      frequency: briefingPreferences.frequency,
      email: users.email,
      fullName: users.fullName,
    })
    .from(briefingPreferences)
    .innerJoin(users, eq(users.id, briefingPreferences.userId))
    .where(
      and(
        eq(briefingPreferences.enabled, true),
        inArray(briefingPreferences.frequency, frequencies),
        isNull(users.suspendedAt),
      ),
    );

  if (!recipientRows.length) return { sent: 0 };

  const [kpis, events] = await Promise.all([getKpis(), getRecentEvents()]);
  const resendApiKey = process.env.RESEND_API_KEY;
  // O painel da intranet é "/" — "(dashboard)" é route group do Next.js, não
  // segmento de URL. Todo briefing enviado com o sufixo "/dashboard" levava
  // a um 404 (achado #5, P-5.10b).
  const intranetUrl = INTRANET_BASE_URL;
  const dbTpl = await getDbTemplate("intranet-briefing");
  const allEvents = [
    ...events.recentAnnouncements,
    ...events.recentMeetingDecisions,
  ];

  for (const recipient of recipientRows) {
    const label = periodLabel(recipient.frequency, today);
    const displayName = recipient.fullName ?? recipient.email;
    const cadencia = recipient.frequency === "diario" ? "diário" : "semanal";
    const title =
      recipient.frequency === "diario"
        ? `Seu briefing diário — ${label}`
        : `Seu briefing semanal — ${label}`;

    const emailOpts = dbTpl
      ? {
          to: recipient.email,
          ...applyVars(dbTpl, {
            nome: displayName,
            cadencia,
            periodo: label,
            kpis: renderKpisHtml(kpis),
            eventos: renderEventsHtml(allEvents),
            link: intranetUrl,
          }),
        }
      : {
          to: recipient.email,
          subject: title,
          template: React.createElement(BriefingEmail, {
            recipientName: displayName,
            frequency: recipient.frequency,
            periodLabel: label,
            kpis,
            recentAnnouncements: events.recentAnnouncements,
            recentMeetingDecisions: events.recentMeetingDecisions,
            intranetUrl,
          }),
        };

    await createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: recipient.userId,
        channel: "email",
        type: "intranet.briefing",
        title,
        body: `Resumo de ${label}: projetos, tarefas e financeiro.`,
        payload: { frequency: recipient.frequency },
      },
      email: emailOpts,
    });
  }

  return { sent: recipientRows.length };
}

export const briefingCron = inngest.createFunction(
  { id: "intranet-briefing", name: "Intranet: briefing diário/semanal" },
  { cron: "0 7 * * *" },
  async ({ step }) => step.run("run-intranet-briefing", () => runBriefing()),
);
