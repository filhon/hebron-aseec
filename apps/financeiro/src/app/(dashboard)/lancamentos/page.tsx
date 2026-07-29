import { Info, ArrowUp, ArrowDown } from "lucide-react";
import {
  getTransactions,
  getCategories,
  getBankAccounts,
  getCostCenterOptions,
} from "../../../lib/queries";
import { TransactionTable } from "../../../components/transaction-table";

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

export default async function LancamentosPage() {
  const [transactions, categories, accounts, costCenters] = await Promise.all([
    getTransactions(),
    getCategories(),
    getBankAccounts(),
    getCostCenterOptions(),
  ]);

  const LAST_30 = new Date(Date.now() - 30 * DAY);

  const allIn = transactions
    .filter((t) => t.type === "credito")
    .reduce((s, t) => s + t.amount, 0);
  const allOut = transactions
    .filter((t) => t.type === "debito")
    .reduce((s, t) => s + t.amount, 0);
  const result = allIn - allOut;

  const recent30 = transactions.filter((t) => t.occurredAt >= LAST_30);
  const recentIn = recent30
    .filter((t) => t.type === "credito")
    .reduce((s, t) => s + t.amount, 0);
  const recentOut = recent30
    .filter((t) => t.type === "debito")
    .reduce((s, t) => s + t.amount, 0);

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
            label="Total de lançamentos"
            value={`${transactions.length}`}
            sub={`${recent30.length} nos últimos 30 dias`}
          />
          <KpiCard
            label="Entradas (30 dias)"
            value={fmtBRL(recentIn)}
            sub="Créditos no período"
            dir="up"
          />
          <KpiCard
            label="Saídas (30 dias)"
            value={fmtBRL(recentOut)}
            sub="Débitos no período"
            dir="down"
          />
          <KpiCard
            label="Resultado acumulado"
            value={fmtBRL(allIn - allOut)}
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
