"use client";

import { useState, useEffect } from "react";
import { Upload, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import {
  mockBankAccounts,
  mockBankImports,
  mockTransactions,
} from "../../../lib/mock-data";
import { ConciliationView } from "../../../components/conciliation-view";
import { ConciliationSkeleton } from "../../../components/conciliation-skeleton";

// Use the second import (import-002: partial June, has pending items)
const bankImport = mockBankImports[1] ?? null;
const bankAccount = mockBankAccounts[0];

function EmptyNoImport() {
  return (
    <div
      className="flex flex-col items-center text-center rounded-(--radius) border py-20 px-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-(--radius) mb-6"
        style={{ background: "rgba(32,44,133,0.08)" }}
      >
        <Upload className="h-8 w-8" style={{ color: "var(--hb-blue)" }} />
      </div>
      <p
        className="text-xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
      >
        Importe seu primeiro extrato bancário
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--fg-muted)" }}>
        Faça upload de um arquivo OFX ou CSV para iniciar a conciliação
        automática com seus lançamentos registrados.
      </p>
      <a
        href="/importacao"
        className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold"
        style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
      >
        <Upload className="h-4 w-4" />
        Importar extrato
      </a>
      <div
        className="mt-10 w-full max-w-sm rounded-(--radius) px-5 py-4 text-left"
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
            fontSize: "14px",
            color: "var(--fg-invert)",
          }}
        >
          "Sede fiéis no pouco, e sereis fiéis no muito."
        </p>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mt-2"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Lucas 16:10
        </p>
      </div>
    </div>
  );
}

function EmptyAllConciliated() {
  return (
    <div
      className="flex flex-col items-center text-center rounded-(--radius) border py-20 px-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-(--radius) mb-6"
        style={{ background: "var(--hb-green)" }}
      >
        <CheckCircle2 className="h-8 w-8" style={{ color: "var(--hb-blue)" }} />
      </div>
      <p
        className="text-xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
      >
        Todas as transações estão conciliadas
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--fg-muted)" }}>
        Excelente! Não há itens pendentes de conciliação neste extrato. Importe
        um novo extrato para continuar.
      </p>
      <a
        href="/importacao"
        className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) border text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
      >
        Importar novo extrato
      </a>
      <div
        className="mt-10 w-full max-w-sm rounded-(--radius) px-5 py-4 text-left"
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
            fontSize: "14px",
            color: "var(--fg-invert)",
          }}
        >
          "Onde não há bois, o celeiro está vazio; mas pela força do boi há
          abundância nas colheitas."
        </p>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mt-2"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Provérbios 14:4
        </p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center text-center rounded-(--radius) border py-20 px-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-(--radius) mb-5"
        style={{ background: "rgba(234,90,6,0.10)" }}
      >
        <AlertCircle
          className="h-7 w-7"
          style={{ color: "var(--hb-orange-deep)" }}
        />
      </div>
      <p
        className="text-xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
      >
        Erro ao carregar conciliação
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
        Não foi possível buscar os dados do extrato. Verifique sua conexão e
        tente novamente.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold"
        style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
      >
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  );
}

export default function ConciliacaoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setError(false);
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  }

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
        {loading ? (
          <ConciliationSkeleton />
        ) : error ? (
          <ErrorState onRetry={handleRetry} />
        ) : !bankImport || !bankAccount ? (
          <EmptyNoImport />
        ) : bankImport.pendingItems === 0 ? (
          <EmptyAllConciliated />
        ) : (
          <ConciliationView
            bankAccount={bankAccount}
            bankImport={bankImport}
            transactions={mockTransactions}
            onMatch={() => {}}
            onUnmatch={() => {}}
            onCreateTransaction={() => {}}
            onReimport={() => {}}
          />
        )}
      </div>
    </div>
  );
}
