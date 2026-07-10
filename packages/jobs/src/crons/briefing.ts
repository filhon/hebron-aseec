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
  const intranetUrl = `${INTRANET_BASE_URL}/dashboard`;

  for (const recipient of recipientRows) {
    const label = periodLabel(recipient.frequency, today);
    const displayName = recipient.fullName ?? recipient.email;
    const title =
      recipient.frequency === "diario"
        ? `Seu briefing diário — ${label}`
        : `Seu briefing semanal — ${label}`;

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
      email: {
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
      },
    });
  }

  return { sent: recipientRows.length };
}

export const briefingCron = inngest.createFunction(
  { id: "intranet-briefing", name: "Intranet: briefing diário/semanal" },
  { cron: "0 7 * * *" },
  async ({ step }) => step.run("run-intranet-briefing", () => runBriefing()),
);
