"use client";

import { useState } from "react";
import { Plus, ChevronDown, Download } from "lucide-react";
import { ExpenseForm } from "./expense-form";
import { RevenueForm } from "./revenue-form";
import { BankAccountForm } from "./bank-account-form";
import type { AccountCategory, BankAccount } from "@hebron/types/financeiro";
import type { CostCenterOption } from "../lib/queries";

type FormMode = null | "despesa" | "receita";

interface NewEntryMenuProps {
  categories: AccountCategory[];
  costCenters: CostCenterOption[];
  bankAccounts: BankAccount[];
}

export function NewEntryMenu({
  categories,
  costCenters,
  bankAccounts,
}: NewEntryMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(null);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-(--radius) text-xs font-semibold transition-colors"
          style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
        >
          <Plus className="h-3 w-3" />
          Novo lançamento
          <ChevronDown className="h-3 w-3" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-44 rounded-(--radius) border py-1 z-20"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {(
              [
                { key: "despesa", label: "Nova despesa" },
                { key: "receita", label: "Nova receita" },
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

      {menuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {formMode === "despesa" && (
        <ExpenseForm
          categories={categories}
          costCenters={costCenters}
          onClose={() => setFormMode(null)}
        />
      )}
      {formMode === "receita" && (
        <RevenueForm
          categories={categories}
          costCenters={costCenters}
          bankAccounts={bankAccounts}
          onClose={() => setFormMode(null)}
        />
      )}
    </>
  );
}

export function NewBankAccountButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
        style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
      >
        <Plus className="h-3 w-3" />
        Nova conta
      </button>
      {open && <BankAccountForm onClose={() => setOpen(false)} />}
    </>
  );
}

interface CsvRow {
  date: string;
  description: string;
  account: string;
  isCredit: boolean;
  amount: number;
}

export function ExportDashboardCsvButton({ rows }: { rows: CsvRow[] }) {
  function exportCsv() {
    const header = ["Data", "Descrição", "Conta", "Tipo", "Valor"];
    const body = rows.map((r) => [
      r.date,
      r.description,
      r.account,
      r.isCredit ? "Receita" : "Despesa",
      (r.isCredit ? "+" : "-") + r.amount.toFixed(2),
    ]);
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${c}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financeiro-painel.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={exportCsv}
      className="flex items-center gap-1.5 px-3 py-2 rounded-(--radius) border text-xs font-semibold transition-colors"
      style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
    >
      <Download className="h-3 w-3" />
      Exportar
    </button>
  );
}
