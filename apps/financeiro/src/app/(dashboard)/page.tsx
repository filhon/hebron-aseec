"use client";

import {
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Check,
  ArrowRight,
  Plus,
  Info,
} from "lucide-react";
import {
  mockBankAccounts,
  mockTransactions,
  mockPayables,
  mockBatchApprovals,
  mockReceivables,
} from "../../lib/mock-data";
import { CashFlowChart } from "../../components/cash-flow-chart";
import type {
  CashFlowDataPoint,
  CashFlowEvent,
} from "../../components/cash-flow-chart";

// Mock data is anchored to 2026-06-01; use it as reference "today"
const REF = new Date("2026-06-01T00:00:00Z");
const LAST_30 = new Date(REF.getTime() - 30 * 86_400_000);
const NEXT_7 = new Date(REF.getTime() + 7 * 86_400_000);

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildCashFlowData(startBalance: number): CashFlowDataPoint[] {
  const eventsByDay = new Map<number, number>();

  for (const r of mockReceivables) {
    if (r.status === "pendente" && r.expectedAt > REF) {
      const day = Math.round(
        (r.expectedAt.getTime() - REF.getTime()) / 86_400_000,
      );
      if (day <= 30)
        eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + r.amount);
    }
  }

  for (const p of mockPayables) {
    if (p.status !== "pago" && p.status !== "cancelado" && p.dueAt > REF) {
      const day = Math.round((p.dueAt.getTime() - REF.getTime()) / 86_400_000);
      if (day <= 30)
        eventsByDay.set(day, (eventsByDay.get(day) ?? 0) - p.amount);
    }
  }

  const points: CashFlowDataPoint[] = [];
  let balance = startBalance;
  for (let day = 0; day <= 30; day++) {
    balance += eventsByDay.get(day) ?? 0;
    points.push({ day, projectedBalance: Math.max(balance, 0) });
  }
  return points;
}

// KPI computation
const totalBalance = mockBankAccounts.reduce((s, a) => s + a.currentBalance, 0);

const recentTx = mockTransactions.filter((t) => t.occurredAt >= LAST_30);
const monthIn = recentTx
  .filter((t) => t.type === "credito")
  .reduce((s, t) => s + t.amount, 0);
const monthOut = recentTx
  .filter((t) => t.type === "debito")
  .reduce((s, t) => s + t.amount, 0);

const proxPagar = mockPayables
  .filter(
    (p) =>
      (p.status === "autorizado" || p.status === "aprovado") &&
      p.dueAt > REF &&
      p.dueAt <= NEXT_7,
  )
  .reduce((s, p) => s + p.amount, 0);

const cashFlowData = buildCashFlowData(totalBalance);

const cashFlowEvents: CashFlowEvent[] = [
  { day: 10, label: "Repasse Hebron Farmacêutica", type: "income" },
  { day: 5, label: "Apoios missionários", type: "expense" },
  { day: 15, label: "Passagem Moçambique", type: "expense" },
];

const sortedTx = [...mockTransactions]
  .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
  .slice(0, 6);

const pendingBatch = mockBatchApprovals.find((b) => b.status === "pendente");

const latestImport = { total: 11, matched: 9 };
const reconPct = Math.round((latestImport.matched / latestImport.total) * 100);
const circumference = 2 * Math.PI * 32; // r=32

// Sparkline helper
function Sparkline({ pts, color }: { pts: number[]; color: string }) {
  const w = 72,
    h = 24;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const step = w / (pts.length - 1);
  const d = pts
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((v - min) / range) * (h - 2) - 1).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="absolute bottom-3 right-3 opacity-70">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// KPI Card
interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  deltaDir?: "up" | "down" | "neutral";
  accent?: boolean;
  sparkPts?: number[];
  sparkColor?: string;
}

function KpiCard({
  label,
  value,
  delta,
  deltaDir = "up",
  accent,
  sparkPts,
  sparkColor,
}: KpiCardProps) {
  const base = accent
    ? "bg-(--hb-blue) border-transparent"
    : "bg-(--surface) border-(--border)";
  const labelCls = accent ? "text-white/60" : "text-(--fg-muted)";
  const valueCls = accent ? "text-(--fg-invert)" : "text-(--fg)";
  const deltaCls =
    deltaDir === "up"
      ? accent
        ? "text-(--hb-green)"
        : "text-(--hb-green-deep)"
      : deltaDir === "down"
        ? "text-(--hb-orange-deep)"
        : accent
          ? "text-white/50"
          : "text-(--fg-muted)";

  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 ${base}`}>
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.14em] mb-2 ${labelCls}`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold tabular-nums leading-none ${valueCls}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <div
        className={`flex items-center gap-1 mt-2.5 text-xs font-semibold ${deltaCls}`}
      >
        {deltaDir === "up" && <ArrowUp className="h-3 w-3" />}
        {deltaDir === "down" && <ArrowDown className="h-3 w-3" />}
        <span>{delta}</span>
      </div>
      {sparkPts && (
        <Sparkline pts={sparkPts} color={sparkColor ?? "var(--hb-cyan)"} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <div>
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
              Painel financeiro
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
            >
              <ArrowDown className="h-3 w-3" />
              Exportar
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              <Plus className="h-3 w-3" />
              Novo lançamento
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Saldo consolidado"
            value={fmtBRL(totalBalance)}
            delta="+8,4% no mês"
            deltaDir="up"
            accent
            sparkPts={[
              118, 122, 126, 130, 135, 140, 147, 154, 158, 161, 165, 168,
            ]}
            sparkColor="var(--hb-cyan)"
          />
          <KpiCard
            label="Receitas no mês"
            value={fmtBRL(monthIn)}
            delta="+R$ 12.300 vs mai"
            deltaDir="up"
            sparkPts={[78, 82, 86, 90, 92, 96, 100, 103, 107, 110, 113, 115]}
            sparkColor="var(--hb-green)"
          />
          <KpiCard
            label="Despesas no mês"
            value={fmtBRL(monthOut)}
            delta="−R$ 3.800 vs mai"
            deltaDir="up"
            sparkPts={[90, 94, 97, 94, 90, 87, 85, 88, 90, 88, 86, 83]}
            sparkColor="var(--hb-orange)"
          />
          <KpiCard
            label="A pagar (7 dias)"
            value={fmtBRL(proxPagar)}
            delta="3 lotes em fluxo"
            deltaDir="down"
            sparkPts={[10, 18, 30, 26, 34, 42, 50, 46, 54, 58, 56, 62]}
            sparkColor="var(--hb-blue)"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* Cash flow chart */}
            <CashFlowChart
              currentBalance={totalBalance}
              dataPoints={cashFlowData}
              events={cashFlowEvents}
            />

            {/* Bank accounts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {mockBankAccounts.length} contas ativas
                  </p>
                  <p
                    className="text-base font-bold"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--fg)",
                    }}
                  >
                    Saldo por conta bancária
                  </p>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--fg-muted)",
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Nova conta
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mockBankAccounts.map((acc, i) => {
                  const bands = [
                    "var(--hb-blue)",
                    "var(--hb-cyan)",
                    "var(--hb-green)",
                  ];
                  const logos = ["#EC7000", "#073B4C", "#1A6B3B"];
                  const short = acc.bank.slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={acc.id}
                      className="relative overflow-hidden rounded-xl border p-5"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full w-1"
                        style={{ background: bands[i] ?? "var(--hb-blue)" }}
                      />
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shrink-0"
                          style={{ background: logos[i] ?? "#202C85" }}
                        >
                          {short}
                        </span>
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {acc.bank}
                        </span>
                      </div>
                      <p
                        className="text-xl font-bold tabular-nums"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--fg)",
                        }}
                      >
                        {fmtBRL(acc.currentBalance)}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {acc.type === "corrente"
                          ? "Conta corrente"
                          : acc.type === "poupanca"
                            ? "Poupança"
                            : "Reserva"}{" "}
                        · ag {acc.agency}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent transactions */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <p
                  className="font-bold text-sm"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--fg)",
                  }}
                >
                  Lançamentos recentes
                </p>
                <a
                  href="/lancamentos"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--hb-blue)" }}
                >
                  Ver todos <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm"
                  style={{ borderCollapse: "separate", borderSpacing: 0 }}
                >
                  <thead>
                    <tr>
                      {["Data", "Descrição", "Conta", "Status", "Valor"].map(
                        (h, i) => (
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
                              textAlign: i === 4 ? "right" : "left",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTx.map((t) => {
                      const isCredit = t.type === "credito";
                      const acct = mockBankAccounts.find(
                        (a) => a.id === t.bankAccountId,
                      );
                      return (
                        <tr
                          key={t.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid var(--divider)" }}
                        >
                          <td
                            className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            {fmtDate(t.occurredAt)}
                          </td>
                          <td
                            className="px-4 py-3.5 font-semibold max-w-48 truncate"
                            style={{ color: "var(--fg)", maxWidth: "12rem" }}
                          >
                            {t.description}
                          </td>
                          <td
                            className="px-4 py-3.5 text-xs"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            {acct?.bank.slice(0, 8) ?? "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            {t.reconciledAt ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  background: "var(--hb-green-muted)",
                                  color: "var(--hb-green-deep)",
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                Conciliado
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  background: "var(--surface-alt)",
                                  color: "var(--fg-muted)",
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                Pendente
                              </span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap"
                            style={{
                              color: isCredit
                                ? "var(--hb-green-deep)"
                                : "var(--hb-orange-deep)",
                            }}
                          >
                            {isCredit ? "+" : "−"} {fmtBRL(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Pending batch alert */}
            {pendingBatch && (
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: "var(--hb-orange)",
                  background: "var(--surface)",
                  boxShadow: "0 4px 16px rgba(234,90,6,0.10)",
                }}
              >
                <div className="flex items-start gap-3 px-5 py-4">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0"
                    style={{ background: "var(--hb-orange)" }}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5"
                      style={{ color: "var(--hb-orange-deep)" }}
                    >
                      Aguardando aprovação
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--fg)",
                      }}
                    >
                      Semana de {fmtDate(pendingBatch.weekStart)}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {pendingBatch.payables.length} pagamentos totalizando{" "}
                      <strong style={{ color: "var(--fg)" }}>
                        {fmtBRL(pendingBatch.totalAmount)}
                      </strong>{" "}
                      aguardam aprovação do Diretor Gestor.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-4">
                  <a
                    href="/contas-pagar"
                    className="flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: "var(--hb-blue)",
                      color: "var(--fg-invert)",
                    }}
                  >
                    Revisar lote
                  </a>
                  <button
                    className="px-4 py-2 rounded-lg border text-xs font-semibold transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    Adiar
                  </button>
                </div>
              </div>
            )}

            {/* Governance flow */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Governança dual
                </p>
                <p
                  className="font-bold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--fg)",
                  }}
                >
                  Fluxo do pagamento
                </p>
              </div>
              <div
                className="grid grid-cols-4 divide-x"
                style={
                  {
                    "--tw-divide-color": "var(--border)",
                  } as React.CSSProperties
                }
              >
                {[
                  {
                    label: "Criação",
                    sub: "Sistema agrupou",
                    done: true,
                    current: false,
                  },
                  {
                    label: "Aprovação",
                    sub: "Dir. Gestor",
                    done: false,
                    current: true,
                  },
                  {
                    label: "Autorização",
                    sub: "Dir. Autorizador",
                    done: false,
                    current: false,
                  },
                  {
                    label: "Pagamento",
                    sub: "Super admin",
                    done: false,
                    current: false,
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="px-3 py-3 border-r last:border-r-0 flex flex-col gap-1"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: step.done
                          ? "var(--hb-green)"
                          : step.current
                            ? "var(--hb-orange)"
                            : "var(--surface-alt)",
                        color: step.done
                          ? "var(--hb-blue)"
                          : step.current
                            ? "#fff"
                            : "var(--fg-muted)",
                      }}
                    >
                      {step.done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.08em] mt-1"
                      style={{
                        color:
                          step.done || step.current
                            ? "var(--fg)"
                            : "var(--fg-muted)",
                      }}
                    >
                      {step.label}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {step.sub}
                    </p>
                  </div>
                ))}
              </div>
              <div
                className="mx-5 my-3 flex items-start gap-2.5 rounded-xl p-3"
                style={{ background: "var(--bg-alt)" }}
              >
                <Info
                  className="h-4 w-4 shrink-0 mt-0.5"
                  style={{ color: "var(--hb-blue)" }}
                />
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Quem aprova nunca pode autorizar. As duas camadas exigem
                  pessoas diferentes — regra inviolável da governança.
                </p>
              </div>
            </div>

            {/* Reconciliation status */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Bradesco · Conta principal
                  </p>
                  <p
                    className="font-bold"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--fg)",
                    }}
                  >
                    Conciliação bancária
                  </p>
                </div>
                <a
                  href="/conciliacao"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--hb-blue)" }}
                >
                  Conciliar <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center gap-5 px-5 py-4">
                <div className="flex-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Pendentes
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--fg)",
                    }}
                  >
                    {latestImport.total - latestImport.matched}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    de {latestImport.total} linhas importadas
                  </p>
                </div>
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 80 80"
                  className="shrink-0"
                >
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="var(--surface-alt)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="var(--hb-green)"
                    strokeWidth="8"
                    strokeDasharray={`${(latestImport.matched / latestImport.total) * circumference} ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text
                    x="40"
                    y="46"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="700"
                    fill="var(--fg)"
                    fontFamily="var(--font-display, sans-serif)"
                  >
                    {reconPct}%
                  </text>
                </svg>
              </div>
            </div>

            {/* Verse */}
            <div
              className="rounded-xl px-5 py-5"
              style={{ background: "var(--hb-blue)" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
                style={{ color: "var(--hb-cyan)" }}
              >
                Mordomia cristã
              </p>
              <p
                className="leading-relaxed italic"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "15px",
                  color: "var(--fg-invert)",
                }}
              >
                "Cada um administre aos outros o dom como o recebeu, como bons
                despenseiros da multiforme graça de Deus."
              </p>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.12em] mt-3"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                1 Pedro 4:10
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
