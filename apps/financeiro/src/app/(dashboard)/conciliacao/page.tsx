"use client";

import {
  mockBankAccounts,
  mockBankImports,
  mockTransactions,
} from "../../../lib/mock-data";
import { ConciliationView } from "../../../components/conciliation-view";

// Use the second import (import-002: partial June, has pending items)
const bankImport = mockBankImports[1] ?? null;
const bankAccount = mockBankAccounts[0];

export default function ConciliacaoPage() {
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
            Conciliação bancária
          </p>
        </div>
      </div>

      <div className="p-6">
        {bankImport && bankAccount ? (
          <ConciliationView
            bankAccount={bankAccount}
            bankImport={bankImport}
            transactions={mockTransactions}
            onMatch={() => {}}
            onUnmatch={() => {}}
            onCreateTransaction={() => {}}
            onReimport={() => {}}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-lg font-bold mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Nenhuma importação pendente
            </p>
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              Faça upload de um extrato OFX ou CSV para iniciar a conciliação.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
