"use client";

import { useState, useMemo } from "react";
import { Download, Plus, TrendingUp } from "lucide-react";
import type { Budget, Transaction } from "@hebron/types/financeiro";

interface BudgetComparisonProps {
  budgets: Budget[];
  transactions: Transaction[];
  onNew?: () => void;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function clsx(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

type ViewMode = "categorias" | "projetos";

interface BudgetRow {
  key: string;
  label: string;
  sublabel?: string;
  plannedAmount: number;
  executedAmount: number;
  pct: number;
}

export function BudgetComparison({
  budgets,
  transactions,
  onNew,
}: BudgetComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("categorias");

  // Sum executed amount per categoryId from transactions
  const executedByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "debito" && t.categoryId) {
        map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount;
      }
    }
    return map;
  }, [transactions]);

  // Sum executed amount per costCenterId from transactions
  const executedByCostCenter = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "debito" && t.costCenterId) {
        map[t.costCenterId] = (map[t.costCenterId] ?? 0) + t.amount;
      }
    }
    return map;
  }, [transactions]);

  // Build rows by category (aggregate all budget items)
  const categoryRows = useMemo<BudgetRow[]>(() => {
    const byCategory: Record<string, { name: string; planned: number }> = {};
    for (const bud of budgets) {
      for (const item of bud.items) {
        if (!byCategory[item.categoryId]) {
          byCategory[item.categoryId] = { name: item.categoryName, planned: 0 };
        }
        const existing = byCategory[item.categoryId];
        if (existing) {
          existing.planned += item.plannedAmount;
        }
      }
    }
    return Object.entries(byCategory).map(([catId, { name, planned }]) => {
      const executed = executedByCategory[catId] ?? 0;
      const pct = planned > 0 ? Math.round((executed / planned) * 100) : 0;
      return {
        key: catId,
        label: name,
        plannedAmount: planned,
        executedAmount: executed,
        pct,
      };
    });
  }, [budgets, executedByCategory]);

  // Build rows by project/cost center
  const projectRows = useMemo<BudgetRow[]>(() => {
    return budgets.map((bud) => {
      const costCenterId = bud.costCenterId;
      const executed = costCenterId
        ? (executedByCostCenter[costCenterId] ?? 0)
        : 0;
      const pct =
        bud.totalAmount > 0
          ? Math.round((executed / bud.totalAmount) * 100)
          : 0;
      return {
        key: bud.id,
        label: bud.name,
        sublabel: costCenterId ?? undefined,
        plannedAmount: bud.totalAmount,
        executedAmount: executed,
        pct,
      };
    });
  }, [budgets, executedByCostCenter]);

  const rows = viewMode === "categorias" ? categoryRows : projectRows;

  const totalPlanned = rows.reduce((s, r) => s + r.plannedAmount, 0);
  const totalExecuted = rows.reduce((s, r) => s + r.executedAmount, 0);
  const overallPct =
    totalPlanned > 0 ? Math.round((totalExecuted / totalPlanned) * 100) : 0;

  const barColor = (pct: number) => {
    if (pct >= 95) return "bg-(--color-destructive)";
    if (pct >= 80) return "bg-(--hb-orange)";
    return "bg-(--hb-blue)";
  };

  const pctColor = (pct: number) => {
    if (pct >= 95) return "text-(--color-destructive)";
    if (pct >= 80) return "text-(--hb-orange-deep)";
    return "text-(--hb-blue)";
  };

  return (
    <div className="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
      {/* KPI summary */}
      <div className="grid grid-cols-3 divide-x divide-(--border) border-b border-(--border)">
        {[
          {
            label: "Orçamento total",
            value: fmtBRL(totalPlanned),
            hint: "Ano-calendário",
            accent: true,
          },
          {
            label: "Executado",
            value: fmtBRL(totalExecuted),
            hint: `${overallPct}% do total`,
            accent: false,
          },
          {
            label: "Disponível",
            value: fmtBRL(Math.max(0, totalPlanned - totalExecuted)),
            hint: `${100 - overallPct}% restantes`,
            accent: false,
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={clsx(
              "px-5 py-4",
              kpi.accent && "bg-(--hb-blue) text-(--fg-invert)",
            )}
          >
            <p
              className={clsx(
                "text-[10px] font-bold uppercase tracking-[0.14em] mb-1",
                kpi.accent ? "text-(--fg-invert-muted)" : "text-(--fg-muted)",
              )}
            >
              {kpi.label}
            </p>
            <p
              className="text-xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {kpi.value}
            </p>
            <p
              className={clsx(
                "text-xs mt-0.5",
                kpi.accent ? "text-(--fg-invert-muted)" : "text-(--fg-muted)",
              )}
            >
              {kpi.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-(--border)">
        <div className="flex bg-(--bg-alt) border border-(--border) p-1 rounded-(--radius) gap-1">
          {(
            [
              { id: "categorias" as ViewMode, label: "Por categoria" },
              { id: "projetos" as ViewMode, label: "Por projeto / CC" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                viewMode === tab.id
                  ? "bg-(--hb-blue) text-(--fg-invert)"
                  : "text-(--fg-muted) hover:text-(--fg)",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors">
            <Download className="h-3 w-3" />
            Exportar
          </button>
          {onNew && (
            <button
              onClick={onNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors"
            >
              <Plus className="h-3 w-3" />
              Novo orçamento
            </button>
          )}
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid gap-3 px-5 py-2.5 bg-(--bg-alt) border-b border-(--border) text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)"
        style={{
          gridTemplateColumns: "1fr 120px 120px 80px minmax(140px,1fr)",
        }}
      >
        <span>{viewMode === "categorias" ? "Categoria" : "Orçamento"}</span>
        <span className="text-right">Planejado</span>
        <span className="text-right">Executado</span>
        <span className="text-right">% exec.</span>
        <span>Andamento</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-(--divider)">
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-(--fg-muted)">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum orçamento configurado.</p>
          </div>
        )}

        {rows.map((row) => (
          <div
            key={row.key}
            className="grid items-center gap-3 px-5 py-4 hover:bg-(--bg-alt)/60 transition-colors"
            style={{
              gridTemplateColumns: "1fr 120px 120px 80px minmax(140px,1fr)",
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-(--fg) truncate">
                {row.label}
              </p>
              {row.sublabel && (
                <p className="text-xs text-(--fg-muted) truncate">
                  {row.sublabel}
                </p>
              )}
            </div>

            <p className="text-sm font-semibold tabular-nums text-right text-(--fg)">
              {fmtBRL(row.plannedAmount)}
            </p>

            <p className="text-sm tabular-nums text-right text-(--fg-muted)">
              {fmtBRL(row.executedAmount)}
            </p>

            <p
              className={clsx(
                "text-sm font-bold tabular-nums text-right",
                pctColor(row.pct),
              )}
            >
              {row.pct}%
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-(--surface-alt) rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all",
                    barColor(row.pct),
                  )}
                  style={{ width: `${Math.min(row.pct, 100)}%` }}
                />
              </div>
              {row.pct >= 95 && (
                <span className="text-[10px] font-bold text-(--color-destructive) shrink-0">
                  ATENÇÃO
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total row */}
      {rows.length > 0 && (
        <div
          className="grid items-center gap-3 px-5 py-3.5 border-t border-(--border) bg-(--bg-alt)"
          style={{
            gridTemplateColumns: "1fr 120px 120px 80px minmax(140px,1fr)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-(--fg-muted)">
            Total
          </p>
          <p className="text-sm font-bold tabular-nums text-right text-(--fg)">
            {fmtBRL(totalPlanned)}
          </p>
          <p className="text-sm tabular-nums text-right text-(--fg-muted)">
            {fmtBRL(totalExecuted)}
          </p>
          <p
            className={clsx(
              "text-sm font-bold tabular-nums text-right",
              pctColor(overallPct),
            )}
          >
            {overallPct}%
          </p>
          <div className="flex-1 h-2 bg-(--surface-alt) rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                barColor(overallPct),
              )}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
