import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  getBankAccounts,
  getPayables,
  getReceivables,
} from "../../../lib/queries";
import { buildCashFlowData } from "../../../lib/cashflow";
import { CashFlowChart } from "../../../components/cash-flow-chart";
import type { CashFlowEvent } from "../../../components/cash-flow-chart";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface UpcomingRow {
  id: string;
  date: Date;
  description: string;
  type: "income" | "expense";
  amount: number;
}

export default async function FluxoCaixaPage() {
  const [bankAccounts, payables, receivables] = await Promise.all([
    getBankAccounts(),
    getPayables(),
    getReceivables(),
  ]);

  const totalBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const now = Date.now();
  const DAY = 86_400_000;

  const cashFlowData = buildCashFlowData(
    totalBalance,
    receivables,
    payables,
    90,
  );

  const upcoming: UpcomingRow[] = [
    ...receivables
      .filter(
        (r) =>
          r.status === "pendente" &&
          r.expectedAt &&
          r.expectedAt.getTime() > now,
      )
      .map((r) => ({
        id: r.id,
        date: r.expectedAt as Date,
        description: r.description,
        type: "income" as const,
        amount: r.amount,
      })),
    ...payables
      .filter(
        (p) =>
          p.status !== "pago" &&
          p.status !== "cancelado" &&
          p.dueAt.getTime() > now,
      )
      .map((p) => ({
        id: p.id,
        date: p.dueAt,
        description: p.description,
        type: "expense" as const,
        amount: p.amount,
      })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 20);

  const cashFlowEvents: CashFlowEvent[] = upcoming.slice(0, 6).map((u) => ({
    day: Math.round((u.date.getTime() - now) / DAY),
    label: u.description,
    type: u.type,
  }));

  const totalIncoming = upcoming
    .filter((u) => u.type === "income")
    .reduce((s, u) => s + u.amount, 0);
  const totalOutgoing = upcoming
    .filter((u) => u.type === "expense")
    .reduce((s, u) => s + u.amount, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--fg-muted)" }}
        >
          Financeiro
        </p>
        <p
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
        >
          Fluxo de caixa
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className="rounded-(--radius) border p-5"
            style={{ background: "var(--hb-blue)", borderColor: "transparent" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--fg-invert-muted)" }}
            >
              Saldo atual
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg-invert)",
              }}
            >
              {fmtBRL(totalBalance)}
            </p>
          </div>
          <div
            className="rounded-(--radius) border p-5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              A receber (90 dias)
            </p>
            <p
              className="text-2xl font-bold tabular-nums flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--hb-green-deep)",
              }}
            >
              <ArrowUpRight className="h-4 w-4" />
              {fmtBRL(totalIncoming)}
            </p>
          </div>
          <div
            className="rounded-(--radius) border p-5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              A pagar (90 dias)
            </p>
            <p
              className="text-2xl font-bold tabular-nums flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--hb-orange-deep)",
              }}
            >
              <ArrowDownRight className="h-4 w-4" />
              {fmtBRL(totalOutgoing)}
            </p>
          </div>
        </div>

        <CashFlowChart
          currentBalance={totalBalance}
          dataPoints={cashFlowData}
          events={cashFlowEvents}
        />

        {/* Upcoming events table */}
        <div
          className="rounded-(--radius) border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <p
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Próximos eventos
            </p>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Nenhum evento financeiro previsto nos próximos 90 dias.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ borderCollapse: "separate", borderSpacing: 0 }}
              >
                <thead>
                  <tr>
                    {["Data", "Descrição", "Tipo", "Valor"].map((h, i) => (
                      <th
                        key={h}
                        className="border-b px-4 py-2.5 text-left"
                        style={{
                          background: "var(--bg)",
                          borderColor: "var(--border)",
                          color: "var(--fg-muted)",
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          textAlign: i === 3 ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((u) => (
                    <tr
                      key={u.id}
                      style={{ borderBottom: "1px solid var(--divider)" }}
                    >
                      <td
                        className="px-4 py-3.5 text-xs tabular-nums"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {fmtDate(u.date)}
                      </td>
                      <td
                        className="px-4 py-3.5 font-semibold"
                        style={{ color: "var(--fg)" }}
                      >
                        {u.description}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              u.type === "income"
                                ? "var(--hb-green-muted)"
                                : "var(--hb-orange-muted)",
                            color:
                              u.type === "income"
                                ? "var(--hb-green-deep)"
                                : "var(--hb-orange-deep)",
                          }}
                        >
                          {u.type === "income" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 text-right font-bold tabular-nums"
                        style={{
                          color:
                            u.type === "income"
                              ? "var(--hb-green-deep)"
                              : "var(--hb-orange-deep)",
                        }}
                      >
                        {u.type === "income" ? "+" : "−"} {fmtBRL(u.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
