"use client";

import { useState } from "react";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import { mockBudgets, mockTransactions } from "../../../lib/mock-data";
import { BudgetComparison } from "../../../components/budget-comparison";
import { BudgetForm } from "../../../components/budget-form";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

// KPI computation
const totalApproved = mockBudgets.reduce((s, b) => s + b.totalAmount, 0);
const totalUsed = mockBudgets.reduce((s, b) => {
  const used = mockTransactions
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
      className="rounded-xl border p-5"
      style={{
        background: accent ? "var(--hb-blue)" : "var(--surface)",
        borderColor: accent ? "transparent" : "var(--border)",
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
        style={{ color: accent ? "rgba(255,255,255,0.6)" : "var(--fg-muted)" }}
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

export default function OrcamentoPage() {
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);

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
              Orçamento anual
            </p>
          </div>
          <button
            onClick={() => setBudgetFormOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            <Plus className="h-3 w-3" />
            Novo orçamento
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Orçamentos ativos"
            value={`${mockBudgets.length}`}
            sub={`Exercício ${mockBudgets[0]?.year ?? 2026}`}
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

        {/* BudgetComparison component */}
        <BudgetComparison
          budgets={mockBudgets}
          transactions={mockTransactions}
          onNew={() => setBudgetFormOpen(true)}
        />
      </div>

      {budgetFormOpen && (
        <BudgetForm onClose={() => setBudgetFormOpen(false)} />
      )}
    </div>
  );
}
