import { Info, ArrowUp, ArrowDown } from "lucide-react";
import {
  getTransactions,
  getTransactionTotals,
  getCategories,
  getBankAccounts,
  getCostCenterOptions,
  currentMonthRange,
  AGGREGATE_FETCH_LIMIT,
} from "../../../lib/queries";
import { TransactionTable } from "../../../components/transaction-table";
import { PeriodFilter } from "../../../components/period-filter";

const DAY = 86_400_000;

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  dir?: "up" | "down";
}

function KpiCard({ label, value, sub, accent, dir }: KpiCardProps) {
  return (
    <div
      className="rounded-(--radius) border p-5"
      style={{
        background: accent ? "var(--hb-blue)" : "var(--surface)",
        borderColor: accent ? "transparent" : "var(--border)",
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
        style={{
          color: accent ? "var(--fg-invert-muted)" : "var(--fg-muted)",
        }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{
          fontFamily: "var(--font-display)",
          color: accent ? "var(--fg-invert)" : "var(--fg)",
        }}
      >
        {value}
      </p>
      {sub && (
        <div
          className="flex items-center gap-1 mt-2 text-xs font-semibold"
          style={{
            color:
              dir === "up"
                ? "var(--hb-green-deep)"
                : dir === "down"
                  ? "var(--hb-orange-deep)"
                  : "var(--fg-muted)",
          }}
        >
          {dir === "up" && <ArrowUp className="h-3 w-3" />}
          {dir === "down" && <ArrowDown className="h-3 w-3" />}
          {sub}
        </div>
      )}
    </div>
  );
}

interface LancamentosPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function LancamentosPage({
  searchParams,
}: LancamentosPageProps) {
  const sp = await searchParams;
  const defaultRange = currentMonthRange();
  const from = sp.from ?? defaultRange.from;
  const to = sp.to ?? defaultRange.to;

  const last30Str =
    new Date(Date.now() - 30 * DAY).toISOString().split("T")[0] ?? "";

  const [
    { items: transactions, total },
    categories,
    accounts,
    costCenters,
    allTimeTotals,
    last30Totals,
  ] = await Promise.all([
    getTransactions({ from, to, limit: AGGREGATE_FETCH_LIMIT }),
    getCategories(),
    getBankAccounts(),
    getCostCenterOptions(),
    getTransactionTotals(),
    getTransactionTotals({ from: last30Str }),
  ]);

  const result = allTimeTotals.credito - allTimeTotals.debito;
  const recentIn = last30Totals.credito;
  const recentOut = last30Totals.debito;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
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
            Lançamentos
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Lançamentos no período"
            value={`${total}`}
            sub="Conforme filtro de período abaixo"
          />
          <KpiCard
            label="Entradas (30 dias)"
            value={fmtBRL(recentIn)}
            sub="Créditos — últimos 30 dias"
            dir="up"
          />
          <KpiCard
            label="Saídas (30 dias)"
            value={fmtBRL(recentOut)}
            sub="Débitos — últimos 30 dias"
            dir="down"
          />
          <KpiCard
            label="Resultado acumulado"
            value={fmtBRL(result)}
            sub={result > 0 ? "Superávit acumulado" : "Déficit acumulado"}
            dir={result > 0 ? "up" : "down"}
            accent
          />
        </div>

        {/* Imutability notice */}
        <div
          className="flex items-center gap-2.5 rounded-(--radius) border px-4 py-3 text-xs"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--fg-muted)",
          }}
        >
          <Info
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--hb-blue)" }}
          />
          <span>
            Lançamentos são{" "}
            <strong style={{ color: "var(--fg)" }}>imutáveis</strong>. Correções
            acontecem por estorno, nunca por edição direta. Qualquer alteração
            gera trilha de auditoria.
          </span>
        </div>

        {/* Period filter */}
        <PeriodFilter
          defaultFrom={defaultRange.from}
          defaultTo={defaultRange.to}
          total={total}
          label="lançamentos"
        />

        {/* Table */}
        <TransactionTable
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          costCenters={costCenters}
        />
      </div>
    </div>
  );
}
