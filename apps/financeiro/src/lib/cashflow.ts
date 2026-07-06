import type { getPayables, getReceivables } from "./queries";
import type { CashFlowDataPoint } from "../components/cash-flow-chart";

const DAY = 86_400_000;

export function buildCashFlowData(
  startBalance: number,
  receivables: Awaited<ReturnType<typeof getReceivables>>,
  payables: Awaited<ReturnType<typeof getPayables>>,
  horizonDays = 90,
): CashFlowDataPoint[] {
  const now = Date.now();
  const eventsByDay = new Map<number, number>();

  for (const r of receivables) {
    if (
      r.status === "pendente" &&
      r.expectedAt &&
      r.expectedAt.getTime() > now
    ) {
      const day = Math.round((r.expectedAt.getTime() - now) / DAY);
      if (day <= horizonDays)
        eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + r.amount);
    }
  }

  for (const p of payables) {
    if (
      p.status !== "pago" &&
      p.status !== "cancelado" &&
      p.dueAt.getTime() > now
    ) {
      const day = Math.round((p.dueAt.getTime() - now) / DAY);
      if (day <= horizonDays)
        eventsByDay.set(day, (eventsByDay.get(day) ?? 0) - p.amount);
    }
  }

  const points: CashFlowDataPoint[] = [];
  let balance = startBalance;
  for (let day = 0; day <= horizonDays; day++) {
    balance += eventsByDay.get(day) ?? 0;
    points.push({ day, projectedBalance: Math.max(balance, 0) });
  }
  return points;
}
