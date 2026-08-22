import { ArrowUp, ArrowDown } from "lucide-react";
import {
  getBudgets,
  getTransactions,
  getCategories,
  getCostCenterOptions,
  AGGREGATE_FETCH_LIMIT,
} from "../../../lib/queries";
import { BudgetComparison } from "../../../components/budget-comparison";

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

export default async function OrcamentoPage() {
  const [budgets, { items: transactions }, categories, costCenters] =
    await Promise.all([
      getBudgets(),
      getTransactions({ limit: AGGREGATE_FETCH_LIMIT }),
      getCategories(),
      getCostCenterOptions(),
    ]);

  const totalApproved = budgets.reduce((s, b) => s + b.totalAmount, 0);
  const totalUsed = budgets.reduce((s, b) => {
    const used = transactions
      .filter(
        (t) =>
          t.type === "debito" &&
          t.costCenterId &&
          t.costCenterId === b.costCenterId,
      )
      .reduce((acc, t) => acc + t.amount, 0);
    return s + used;
  }, 0);
  const pctUsed = totalApproved > 0 ? (totalUsed / totalApproved) * 100 : 0;
  const remaining = totalApproved - totalUsed;

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
            Orçamento anual
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Orçamentos ativos"
            value={`${budgets.length}`}
            sub={`Exercício ${budgets[0]?.year ?? new Date().getFullYear()}`}
          />
          <KpiCard
            label="Total aprovado"
            value={fmtBRL(totalApproved)}
            sub="Limite anual consolidado"
          />
          <KpiCard
            label="Executado"
            value={fmtBRL(totalUsed)}
            sub={`${pctUsed.toFixed(1)}% do orçamento`}
            dir={pctUsed >= 80 ? "down" : "up"}
          />
          <KpiCard
            label="Saldo disponível"
            value={fmtBRL(remaining)}
            sub={remaining > 0 ? "Dentro do limite" : "Limite atingido"}
            dir={remaining > 0 ? "up" : "down"}
            accent
          />
        </div>

        <BudgetComparison
          budgets={budgets}
          transactions={transactions}
          categories={categories}
          costCenters={costCenters}
        />
      </div>
    </div>
  );
}
