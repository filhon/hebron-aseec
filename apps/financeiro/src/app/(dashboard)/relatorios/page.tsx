"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  mockTransactions,
  mockCategories,
  mockBankAccounts,
} from "../../../lib/mock-data";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

// Compute DRE (Demonstrativo de Resultado)
const totalIn = mockTransactions
  .filter((t) => t.type === "credito")
  .reduce((s, t) => s + t.amount, 0);

const totalOut = mockTransactions
  .filter((t) => t.type === "debito")
  .reduce((s, t) => s + t.amount, 0);

const resultado = totalIn - totalOut;

// Group expenses by L2 category
const expensesByGroup: { name: string; total: number; pct: number }[] = [];
const l2cats = mockCategories.filter(
  (c) => c.type === "despesa" && c.level === 2,
);
for (const group of l2cats) {
  const leafIds = mockCategories
    .filter((c) => c.parentId === group.id && c.level === 3)
    .map((c) => c.id);
  const total = mockTransactions
    .filter((t) => t.type === "debito" && leafIds.includes(t.categoryId ?? ""))
    .reduce((s, t) => s + t.amount, 0);
  if (total > 0) {
    expensesByGroup.push({
      name: group.name,
      total,
      pct: totalOut > 0 ? (total / totalOut) * 100 : 0,
    });
  }
}
expensesByGroup.sort((a, b) => b.total - a.total);

// Group revenue by L2 category
const revenueByGroup: { name: string; total: number }[] = [];
const l2rcats = mockCategories.filter(
  (c) => c.type === "receita" && c.level === 2,
);
for (const group of l2rcats) {
  const leafIds = mockCategories
    .filter((c) => c.parentId === group.id && c.level === 3)
    .map((c) => c.id);
  const total = mockTransactions
    .filter((t) => t.type === "credito" && leafIds.includes(t.categoryId ?? ""))
    .reduce((s, t) => s + t.amount, 0);
  if (total > 0) {
    revenueByGroup.push({ name: group.name, total });
  }
}
revenueByGroup.sort((a, b) => b.total - a.total);

// Saldo por conta
const accountBalances = mockBankAccounts.map((a) => ({
  id: a.id,
  name: a.name,
  bank: a.bank,
  type: a.type,
  balance: a.currentBalance,
}));

const TABS = ["DRE", "Balanço patrimonial", "Fluxo de caixa"] as const;
type Tab = (typeof TABS)[number];

function KpiCard({
  label,
  value,
  dir,
  accent,
}: {
  label: string;
  value: string;
  dir?: "up" | "down";
  accent?: "blue" | "green" | "orange";
}) {
  const bg =
    accent === "blue"
      ? "var(--hb-blue)"
      : accent === "green"
        ? "var(--hb-green)"
        : accent === "orange"
          ? "var(--hb-orange)"
          : "var(--surface)";
  const fg =
    accent === "green"
      ? "var(--hb-blue)"
      : accent
        ? "var(--fg-invert)"
        : "var(--fg)";
  const labelColor = accent ? "rgba(255,255,255,0.65)" : "var(--fg-muted)";

  return (
    <div
      className="rounded-(--radius) border p-5"
      style={{
        background: bg,
        borderColor: accent ? "transparent" : "var(--border)",
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
        style={{ color: labelColor }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums leading-none"
        style={{ fontFamily: "var(--font-display)", color: fg }}
      >
        {value}
      </p>
      {dir && (
        <div
          className="flex items-center gap-1 mt-2 text-xs font-semibold"
          style={{
            color: accent ? "rgba(255,255,255,0.5)" : "var(--fg-muted)",
          }}
        >
          {dir === "up" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          Período atual
        </div>
      )}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden w-full"
      style={{ background: "var(--surface-alt)" }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}

export default function RelatoriosPage() {
  const [tab, setTab] = useState<Tab>("DRE");

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
              Demonstrativos
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-(--radius) border text-xs font-semibold transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
            >
              <Download className="h-3 w-3" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-3 -mb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-xs font-bold border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? "var(--hb-blue)" : "transparent",
                color: tab === t ? "var(--hb-blue)" : "var(--fg-muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {tab === "DRE" && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                label="Receita total"
                value={fmtBRL(totalIn)}
                dir="up"
                accent="blue"
              />
              <KpiCard
                label="Despesa total"
                value={fmtBRL(totalOut)}
                dir="down"
                accent="orange"
              />
              <KpiCard
                label="Resultado"
                value={fmtBRL(resultado)}
                dir={resultado >= 0 ? "up" : "down"}
                accent={resultado >= 0 ? "green" : undefined}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Receitas por grupo */}
              <div
                className="rounded-(--radius) border overflow-hidden"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex items-center gap-3 px-5 py-4 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <TrendingUp
                    className="h-4 w-4"
                    style={{ color: "var(--hb-green-deep)" }}
                  />
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Composição
                    </p>
                    <p
                      className="font-bold text-sm"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--fg)",
                      }}
                    >
                      Receitas por grupo
                    </p>
                  </div>
                  <span
                    className="ml-auto text-lg font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--hb-green-deep)",
                    }}
                  >
                    {fmtBRL(totalIn)}
                  </span>
                </div>
                <div
                  className="divide-y"
                  style={
                    {
                      "--tw-divide-color": "var(--divider)",
                    } as React.CSSProperties
                  }
                >
                  {revenueByGroup.length > 0 ? (
                    revenueByGroup.map((g) => (
                      <div key={g.name} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--fg)" }}
                          >
                            {g.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span
                              className="text-xs"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              {fmtPct(
                                totalIn > 0 ? (g.total / totalIn) * 100 : 0,
                              )}
                            </span>
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{ color: "var(--fg)" }}
                            >
                              {fmtBRL(g.total)}
                            </span>
                          </div>
                        </div>
                        <ProgressBar
                          pct={totalIn > 0 ? (g.total / totalIn) * 100 : 0}
                          color="var(--hb-green)"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <p
                        className="text-sm"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        Nenhuma receita categorizada no período
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Despesas por grupo */}
              <div
                className="rounded-(--radius) border overflow-hidden"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex items-center gap-3 px-5 py-4 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <TrendingDown
                    className="h-4 w-4"
                    style={{ color: "var(--hb-orange-deep)" }}
                  />
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Composição
                    </p>
                    <p
                      className="font-bold text-sm"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--fg)",
                      }}
                    >
                      Despesas por grupo
                    </p>
                  </div>
                  <span
                    className="ml-auto text-lg font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--hb-orange-deep)",
                    }}
                  >
                    {fmtBRL(totalOut)}
                  </span>
                </div>
                <div
                  className="divide-y"
                  style={
                    {
                      "--tw-divide-color": "var(--divider)",
                    } as React.CSSProperties
                  }
                >
                  {expensesByGroup.length > 0 ? (
                    expensesByGroup.map((g) => (
                      <div key={g.name} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--fg)" }}
                          >
                            {g.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span
                              className="text-xs"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              {fmtPct(g.pct)}
                            </span>
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{ color: "var(--fg)" }}
                            >
                              {fmtBRL(g.total)}
                            </span>
                          </div>
                        </div>
                        <ProgressBar pct={g.pct} color="var(--hb-orange)" />
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <p
                        className="text-sm"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        Nenhuma despesa categorizada no período
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Balanço patrimonial" && (
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
                Ativo circulante
              </p>
              <p
                className="font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                Saldo por conta bancária
              </p>
            </div>
            <div
              className="divide-y"
              style={
                { "--tw-divide-color": "var(--divider)" } as React.CSSProperties
              }
            >
              {accountBalances.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--fg)" }}
                    >
                      {a.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {a.bank} ·{" "}
                      {a.type === "corrente"
                        ? "Conta corrente"
                        : a.type === "poupanca"
                          ? "Poupança"
                          : "Investimento"}
                    </p>
                  </div>
                  <p
                    className="text-base font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--fg)",
                    }}
                  >
                    {fmtBRL(a.balance)}
                  </p>
                </div>
              ))}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ background: "var(--bg-alt)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--fg)" }}>
                  Total do ativo circulante
                </p>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--hb-blue)",
                  }}
                >
                  {fmtBRL(accountBalances.reduce((s, a) => s + a.balance, 0))}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "Fluxo de caixa" && (
          <div
            className="flex flex-col items-center justify-center rounded-(--radius) border py-20 text-center"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-(--radius) mb-4"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              <BarChart3 className="h-6 w-6" />
            </span>
            <p
              className="text-lg font-bold mb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg)",
              }}
            >
              Fluxo de caixa projetado
            </p>
            <p
              className="text-sm max-w-xs"
              style={{ color: "var(--fg-muted)" }}
            >
              O demonstrativo de fluxo será gerado automaticamente após a
              integração com os dados bancários reais no Bloco B.
            </p>
            <p
              className="text-xs font-bold uppercase tracking-[0.14em] mt-4"
              style={{ color: "var(--hb-cyan)" }}
            >
              "O prudente prevê o mal e se esconde." — Prov 22:3
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
