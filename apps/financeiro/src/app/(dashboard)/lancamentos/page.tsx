"use client";

import { useState } from "react";
import { Plus, Info, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import {
  mockTransactions,
  mockCategories,
  mockBankAccounts,
  mockCostCenters,
} from "../../../lib/mock-data";
import { TransactionTable } from "../../../components/transaction-table";
import { ExpenseForm } from "../../../components/expense-form";
import { RevenueForm } from "../../../components/revenue-form";
import { ReversalForm } from "../../../components/reversal-form";

const REF = new Date("2026-06-01T00:00:00Z");
const LAST_30 = new Date(REF.getTime() - 30 * 86_400_000);

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

// KPI computation
const allIn = mockTransactions
  .filter((t) => t.type === "credito")
  .reduce((s, t) => s + t.amount, 0);
const allOut = mockTransactions
  .filter((t) => t.type === "debito")
  .reduce((s, t) => s + t.amount, 0);
const result = allIn - allOut;

const recent30 = mockTransactions.filter((t) => t.occurredAt >= LAST_30);
const recentIn = recent30
  .filter((t) => t.type === "credito")
  .reduce((s, t) => s + t.amount, 0);
const recentOut = recent30
  .filter((t) => t.type === "debito")
  .reduce((s, t) => s + t.amount, 0);

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

type FormMode = null | "despesa" | "receita" | "estorno";

export default function LancamentosPage() {
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
              Lançamentos
            </p>
          </div>
          <div className="ml-auto relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              <Plus className="h-3 w-3" />
              Novo lançamento
              <ChevronDown className="h-3 w-3" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-xl border py-1 z-20"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                }}
              >
                {(
                  [
                    { key: "despesa", label: "Nova despesa" },
                    { key: "receita", label: "Nova receita" },
                    { key: "estorno", label: "Estornar transação" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setFormMode(item.key);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{ color: "var(--fg)" }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total de lançamentos"
            value={`${mockTransactions.length}`}
            sub={`${recent30.length} nos últimos 30 dias`}
          />
          <KpiCard
            label="Entradas (acumulado)"
            value={fmtBRL(recentIn)}
            sub="+R$ 12.300 vs mês anterior"
            dir="up"
          />
          <KpiCard
            label="Saídas (acumulado)"
            value={fmtBRL(recentOut)}
            sub="−4,1% vs mês anterior"
            dir="up"
          />
          <KpiCard
            label="Resultado"
            value={fmtBRL(allIn - allOut)}
            sub={result > 0 ? "Superávit acumulado" : "Déficit acumulado"}
            dir={result > 0 ? "up" : "down"}
            accent
          />
        </div>

        {/* Imutability notice */}
        <div
          className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs"
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
          transactions={mockTransactions}
          categories={mockCategories}
          accounts={mockBankAccounts}
          costCenters={mockCostCenters}
          onNew={() => setFormMode("despesa")}
        />
      </div>

      {/* Forms */}
      {formMode === "despesa" && (
        <ExpenseForm onClose={() => setFormMode(null)} />
      )}
      {formMode === "receita" && (
        <RevenueForm onClose={() => setFormMode(null)} />
      )}
      {formMode === "estorno" && (
        <ReversalForm onClose={() => setFormMode(null)} />
      )}
    </div>
  );
}
