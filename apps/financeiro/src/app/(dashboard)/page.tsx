import { Suspense } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Info, ArrowRight } from "lucide-react";
import {
  getBankAccounts,
  getTransactions,
  getPayables,
  getReceivables,
  getBatchApprovals,
  getCategories,
  getCostCenterOptions,
  getLatestBankImport,
} from "../../lib/queries";
import { buildCashFlowData } from "../../lib/cashflow";
import { CashFlowChart } from "../../components/cash-flow-chart";
import { DashboardSkeleton } from "../../components/dashboard-skeleton";
import {
  NewEntryMenu,
  NewBankAccountButton,
  ExportDashboardCsvButton,
} from "../../components/dashboard-quick-actions";
import type { CashFlowEvent } from "../../components/cash-flow-chart";

const DAY = 86_400_000;

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtDeltaBRL(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign} ${fmtBRL(Math.abs(n))} vs período anterior`;
}

function buildSparkline(
  transactions: Awaited<ReturnType<typeof getTransactions>>,
  filter: (t: Awaited<ReturnType<typeof getTransactions>>[number]) => boolean,
): number[] {
  const now = Date.now();
  const buckets = new Array(12).fill(0);
  for (const t of transactions) {
    if (!filter(t)) continue;
    const daysAgo = Math.floor((now - t.occurredAt.getTime()) / DAY);
    const bucket = 11 - Math.min(11, Math.floor(daysAgo / 5));
    if (bucket >= 0) buckets[bucket] += t.amount;
  }
  // cumulative so the sparkline reads as a trend rather than noisy daily bars
  let acc = 0;
  return buckets.map((v) => (acc += v));
}

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  accent?: boolean;
  sparkPts?: number[];
  sparkColor?: string;
}

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

function KpiCard({
  label,
  value,
  delta,
  deltaDir = "neutral",
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
    <div
      className={`relative overflow-hidden rounded-(--radius) border p-5 ${base}`}
    >
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
      {delta && (
        <div
          className={`flex items-center gap-1 mt-2.5 text-xs font-semibold ${deltaCls}`}
        >
          {deltaDir === "up" && <ArrowUp className="h-3 w-3" />}
          {deltaDir === "down" && <ArrowDown className="h-3 w-3" />}
          <span>{delta}</span>
        </div>
      )}
      {sparkPts && (
        <Sparkline pts={sparkPts} color={sparkColor ?? "var(--hb-cyan)"} />
      )}
    </div>
  );
}

async function DashboardContent() {
  const [
    bankAccounts,
    transactions,
    payables,
    receivables,
    batchApprovals,
    categories,
    costCenters,
    conciliation,
  ] = await Promise.all([
    getBankAccounts(),
    getTransactions(),
    getPayables(),
    getReceivables(),
    getBatchApprovals(),
    getCategories(),
    getCostCenterOptions(),
    getLatestBankImport(),
  ]);

  const now = Date.now();
  const LAST_30 = new Date(now - 30 * DAY);
  const PREV_30 = new Date(now - 60 * DAY);
  const NEXT_7 = new Date(now + 7 * DAY);

  const totalBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);

  const recentTx = transactions.filter((t) => t.occurredAt >= LAST_30);
  const prevTx = transactions.filter(
    (t) => t.occurredAt >= PREV_30 && t.occurredAt < LAST_30,
  );

  const monthIn = recentTx
    .filter((t) => t.type === "credito")
    .reduce((s, t) => s + t.amount, 0);
  const prevIn = prevTx
    .filter((t) => t.type === "credito")
    .reduce((s, t) => s + t.amount, 0);

  const monthOut = recentTx
    .filter((t) => t.type === "debito")
    .reduce((s, t) => s + t.amount, 0);
  const prevOut = prevTx
    .filter((t) => t.type === "debito")
    .reduce((s, t) => s + t.amount, 0);

  const proxPagar = payables
    .filter(
      (p) =>
        (p.status === "autorizado" || p.status === "aprovado") &&
        p.dueAt > new Date(now) &&
        p.dueAt <= NEXT_7,
    )
    .reduce((s, p) => s + p.amount, 0);

  const cashFlowData = buildCashFlowData(
    totalBalance,
    receivables,
    payables,
    90,
  );

  const upcomingReceivables = receivables.filter(
    (r): r is typeof r & { expectedAt: Date } =>
      r.status === "pendente" &&
      r.expectedAt !== null &&
      r.expectedAt.getTime() > now,
  );

  const cashFlowEvents: CashFlowEvent[] = [
    ...upcomingReceivables.slice(0, 2).map((r) => ({
      day: Math.round((r.expectedAt.getTime() - now) / DAY),
      label: r.description,
      type: "income" as const,
    })),
    ...payables
      .filter(
        (p) =>
          p.status !== "pago" &&
          p.status !== "cancelado" &&
          p.dueAt > new Date(now),
      )
      .slice(0, 2)
      .map((p) => ({
        day: Math.round((p.dueAt.getTime() - now) / DAY),
        label: p.description,
        type: "expense" as const,
      })),
  ];

  const sortedTx = [...transactions]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 6);

  const pendingBatch = batchApprovals.find((b) => b.status === "pendente");

  const reconPct =
    conciliation && conciliation.bankImport.totalItems > 0
      ? Math.round(
          (conciliation.bankImport.matchedItems /
            conciliation.bankImport.totalItems) *
            100,
        )
      : 100;
  const circumference = 2 * Math.PI * 32;

  const csvRows = sortedTx.map((t) => {
    const acct = bankAccounts.find((a) => a.id === t.bankAccountId);
    return {
      date: fmtDate(t.occurredAt),
      description: t.description,
      account: acct?.bank ?? "",
      isCredit: t.type === "credito",
      amount: t.amount,
    };
  });

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
            <ExportDashboardCsvButton rows={csvRows} />
            <NewEntryMenu
              categories={categories}
              costCenters={costCenters}
              bankAccounts={bankAccounts}
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Saldo consolidado"
            value={fmtBRL(totalBalance)}
            delta={`${bankAccounts.length} contas ativas`}
            deltaDir="neutral"
            accent
            sparkPts={buildSparkline(transactions, () => true)}
            sparkColor="var(--hb-cyan)"
          />
          <KpiCard
            label="Receitas no mês"
            value={fmtBRL(monthIn)}
            delta={fmtDeltaBRL(monthIn - prevIn)}
            deltaDir={monthIn - prevIn >= 0 ? "up" : "down"}
            sparkPts={buildSparkline(transactions, (t) => t.type === "credito")}
            sparkColor="var(--hb-green)"
          />
          <KpiCard
            label="Despesas no mês"
            value={fmtBRL(monthOut)}
            delta={fmtDeltaBRL(monthOut - prevOut)}
            deltaDir={monthOut - prevOut <= 0 ? "up" : "down"}
            sparkPts={buildSparkline(transactions, (t) => t.type === "debito")}
            sparkColor="var(--hb-orange)"
          />
          <KpiCard
            label="A pagar (7 dias)"
            value={fmtBRL(proxPagar)}
            delta={`${payables.filter((p) => p.batchApprovalId).length} em fluxo de aprovação`}
            deltaDir="neutral"
            sparkPts={buildSparkline(transactions, (t) => t.type === "debito")}
            sparkColor="var(--hb-blue)"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left column */}
          <div className="space-y-5">
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
                    {bankAccounts.length} contas ativas
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
                <NewBankAccountButton />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {bankAccounts.map((acc, i) => {
                  const bands = [
                    "var(--hb-blue)",
                    "var(--hb-cyan)",
                    "var(--hb-green)",
                  ];
                  const short = acc.bank.slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={acc.id}
                      className="relative overflow-hidden rounded-(--radius) border p-5"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full w-1"
                        style={{ background: bands[i % bands.length] }}
                      />
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shrink-0"
                          style={{ background: bands[i % bands.length] }}
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
                {bankAccounts.length === 0 && (
                  <p
                    className="text-sm col-span-3"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Nenhuma conta bancária cadastrada ainda.
                  </p>
                )}
              </div>
            </div>

            {/* Recent transactions */}
            <div
              className="rounded-(--radius) border overflow-hidden"
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
                <Link
                  href="/lancamentos"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--hb-blue)" }}
                >
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Link>
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
                      const acct = bankAccounts.find(
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
                    {sortedTx.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          Nenhum lançamento registrado ainda.
                        </td>
                      </tr>
                    )}
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
                className="rounded-(--radius) border overflow-hidden"
                style={{
                  borderColor: "var(--hb-orange)",
                  background: "var(--surface)",
                  boxShadow: "0 4px 16px var(--accent-tint-strong)",
                }}
              >
                <div className="flex items-start gap-3 px-5 py-4">
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Semana de {fmtDate(pendingBatch.weekStart)} ·{" "}
                    {pendingBatch.payables.length} pagamentos totalizando{" "}
                    <strong style={{ color: "var(--fg)" }}>
                      {fmtBRL(pendingBatch.totalAmount)}
                    </strong>{" "}
                    aguardam aprovação do Diretor Gestor.
                  </p>
                </div>
                <div className="flex gap-2 px-5 pb-4">
                  <Link
                    href="/contas-pagar"
                    className="flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: "var(--hb-blue)",
                      color: "var(--fg-invert)",
                    }}
                  >
                    Revisar lote
                  </Link>
                </div>
              </div>
            )}

            {/* Governance flow */}
            <div
              className="rounded-(--radius) border overflow-hidden"
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
                  { label: "Criação", sub: "Sistema agrupou" },
                  { label: "Aprovação", sub: "Dir. Gestor" },
                  { label: "Autorização", sub: "Dir. Autorizador" },
                  { label: "Pagamento", sub: "Super admin" },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="px-3 py-3 border-r last:border-r-0 flex flex-col gap-1"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: "var(--surface-alt)",
                        color: "var(--fg-muted)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.08em] mt-1"
                      style={{ color: "var(--fg)" }}
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
                className="mx-5 my-3 flex items-start gap-2.5 rounded-xs p-3"
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
              className="rounded-(--radius) border overflow-hidden"
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
                    {conciliation?.bankAccount.bank ?? "Nenhuma conta"}
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
                <Link
                  href="/conciliacao"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--hb-blue)" }}
                >
                  Conciliar <ArrowRight className="h-3 w-3" />
                </Link>
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
                    {conciliation?.bankImport.pendingItems ?? 0}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    de {conciliation?.bankImport.totalItems ?? 0} linhas
                    importadas
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
                    strokeDasharray={`${(reconPct / 100) * circumference} ${circumference}`}
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
              className="rounded-(--radius) px-5 py-5"
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
                &quot;Cada um administre aos outros o dom como o recebeu, como
                bons despenseiros da multiforme graça de Deus.&quot;
              </p>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.12em] mt-3"
                style={{ color: "var(--fg-invert-muted)" }}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
