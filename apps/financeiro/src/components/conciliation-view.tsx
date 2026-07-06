"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  Check,
  Sparkles,
  X,
  Plus,
  Upload,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { autoMatchImport, reconcileRow } from "../actions/conciliation";
import type {
  BankImport,
  Transaction,
  BankAccount,
} from "@hebron/types/financeiro";

interface ConciliationViewProps {
  bankAccount: BankAccount;
  bankImport: BankImport;
  transactions: Transaction[];
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function clsx(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

interface Suggestion {
  rowId: string;
  suggestedPayableId: string | null;
  suggestedReceivableId: string | null;
  confidence: "high" | "medium" | "low";
}

export function ConciliationView({
  bankAccount,
  bankImport,
  transactions,
}: ConciliationViewProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Map<string, Suggestion>>(
    new Map(),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const items = bankImport.items;
  const matchedCount = items.filter(
    (i) => i.matchStatus === "vinculado",
  ).length;
  const ignoredCount = items.filter((i) => i.matchStatus === "ignorado").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((matchedCount / total) * 100) : 0;
  const unmatched = items.filter((i) => i.matchStatus === "pendente");

  const { execute: runAutoMatch, isPending: isMatching } = useAction(
    autoMatchImport,
    {
      onSuccess({ data }) {
        if (!data) return;
        const next = new Map<string, Suggestion>();
        for (const s of data.suggestions) {
          next.set(s.rowId, s);
        }
        setSuggestions(next);
        router.refresh();
      },
    },
  );

  const { execute: runReconcile, isPending: isReconciling } = useAction(
    reconcileRow,
    {
      onSuccess() {
        router.refresh();
      },
    },
  );

  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId)
    : null;
  const selectedSuggestion = selectedItemId
    ? suggestions.get(selectedItemId)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Info card */}
      <div className="rounded-(--radius) border border-(--border) bg-(--surface) px-5 py-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-(--radius) flex items-center justify-center text-sm font-bold text-(--fg-invert) shrink-0"
              style={{ background: "var(--hb-blue)" }}
            >
              {bankAccount.bank.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                {bankAccount.bank}
              </p>
              <p
                className="font-semibold text-(--fg)"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {bankAccount.name}
              </p>
              <p className="text-xs text-(--fg-muted)">
                ag. {bankAccount.agency} / cc {bankAccount.accountNumber}
              </p>
            </div>
          </div>

          <div className="h-9 w-px bg-(--border)" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-0.5">
              Arquivo importado
            </p>
            <p className="text-sm font-semibold text-(--fg)">
              {bankImport.fileName}
            </p>
            <p className="text-xs text-(--fg-muted)">
              {bankImport.format.toUpperCase()} ·{" "}
              {bankImport.importedAt.toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="h-9 w-px bg-(--border)" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-0.5">
              Progresso
            </p>
            <p
              className="text-lg font-bold text-(--hb-blue)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {matchedCount}/{total}{" "}
              <span className="text-sm font-normal text-(--fg-muted)">
                conciliados
              </span>
            </p>
          </div>

          <div className="relative w-14 h-14 shrink-0">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="var(--surface-alt)"
                strokeWidth="5"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="var(--hb-green)"
                strokeWidth="5"
                strokeDasharray={`${(pct / 100) * 138.2} 138.2`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
              />
              <text
                x="28"
                y="33"
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="var(--fg)"
                fontFamily="var(--font-display, sans-serif)"
              >
                {pct}%
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Auto-match action */}
      {unmatched.length > 0 && (
        <div className="flex items-center gap-3 rounded-(--radius) border border-(--hb-cyan-muted) bg-(--hb-cyan-muted) px-4 py-3">
          <Sparkles className="h-4 w-4 text-(--hb-cyan-deep) shrink-0" />
          <p className="text-sm text-(--fg) flex-1">
            <strong>Conciliação automática</strong> · {unmatched.length}{" "}
            {unmatched.length === 1 ? "linha pendente" : "linhas pendentes"}. O
            sistema casa valor + data + descrição com lançamentos, contas a
            pagar e a receber já registrados.
          </p>
          <button
            onClick={() => runAutoMatch({ bankImportId: bankImport.id })}
            disabled={isMatching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-(--border) bg-(--surface) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors shrink-0 disabled:opacity-50"
          >
            {isMatching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Rodar auto-match
          </button>
        </div>
      )}

      {/* Split view */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Extrato bancário ─────────────────────────────────────────────────── */}
        <div className="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Extrato bancário
              </p>
              <p className="font-semibold text-(--fg) text-sm mt-0.5">
                {total} linhas importadas
              </p>
            </div>
            <a
              href="/importacao"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors"
            >
              <Upload className="h-3 w-3" />
              Novo extrato
            </a>
          </div>

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {items.map((item) => {
              const isMatched = item.matchStatus === "vinculado";
              const isIgnored = item.matchStatus === "ignorado";
              const isSelected = selectedItemId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    !isMatched &&
                    !isIgnored &&
                    setSelectedItemId(isSelected ? null : item.id)
                  }
                  className={clsx(
                    "grid gap-2.5 px-4 py-3 border-b border-(--divider) transition-colors text-sm",
                    !isMatched &&
                      !isIgnored &&
                      "cursor-pointer hover:bg-(--bg-alt)",
                    (isMatched || isIgnored) && "opacity-50",
                    isSelected &&
                      "bg-(--hb-cyan-muted) border-l-4 border-l-(--hb-cyan) pl-3",
                  )}
                  style={{ gridTemplateColumns: "88px 1fr 110px" }}
                >
                  <span className="text-xs text-(--fg-muted) tabular-nums self-center">
                    {fmtDate(item.occurredAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-(--fg) truncate">
                      {item.description}
                    </p>
                    <p className="text-xs mt-0.5">
                      {isMatched ? (
                        <span className="text-(--hb-green-deep) font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Conciliado
                        </span>
                      ) : isIgnored ? (
                        <span className="text-(--fg-muted) font-semibold">
                          Ignorado
                        </span>
                      ) : (
                        <span className="text-(--hb-orange-deep) font-semibold">
                          Pendente
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "self-center text-right font-bold tabular-nums text-sm",
                      item.type === "credito"
                        ? "text-(--hb-green-deep)"
                        : "text-(--hb-orange-deep)",
                    )}
                  >
                    {item.type === "credito" ? "+" : "−"} {fmtBRL(item.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Ações de conciliação ─────────────────────────────────────────────── */}
        <div className="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Ações de conciliação
              </p>
              <p className="font-semibold text-(--fg) text-sm mt-0.5">
                {transactions.length} lançamentos no período
              </p>
            </div>
          </div>

          {!selectedItem && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <Sparkles className="h-8 w-8 text-(--fg-muted) opacity-30" />
              <p className="text-sm text-(--fg-muted)">
                Selecione uma linha pendente do extrato para vincular, criar ou
                ignorar o lançamento.
              </p>
            </div>
          )}

          {selectedItem && (
            <div className="px-4 py-4 space-y-3">
              <div className="rounded-lg border border-(--border) bg-(--bg-alt) px-3 py-2.5">
                <p className="text-sm font-semibold text-(--fg)">
                  {selectedItem.description}
                </p>
                <p className="text-xs text-(--fg-muted) mt-0.5">
                  {fmtDate(selectedItem.occurredAt)} ·{" "}
                  {fmtBRL(selectedItem.amount)}
                </p>
              </div>

              {selectedSuggestion &&
                (selectedSuggestion.suggestedPayableId ||
                  selectedSuggestion.suggestedReceivableId) && (
                  <div className="rounded-lg border border-(--hb-green-muted) bg-(--hb-green-muted) px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-(--hb-green-deep) flex items-center gap-1 mb-2">
                      <Sparkles className="h-3 w-3" />
                      Sugestão automática — confiança{" "}
                      {selectedSuggestion.confidence}
                    </p>
                    <button
                      onClick={() =>
                        runReconcile({
                          bankImportItemId: selectedItem.id,
                          action: selectedSuggestion.suggestedPayableId
                            ? "vincular_payable"
                            : "vincular_receivable",
                          payableId: selectedSuggestion.suggestedPayableId,
                          receivableId:
                            selectedSuggestion.suggestedReceivableId,
                        })
                      }
                      disabled={isReconciling}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-green) text-(--hb-blue) text-xs font-bold hover:bg-(--hb-green-deep) transition-colors disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      Vincular sugestão
                    </button>
                  </div>
                )}

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    runReconcile({
                      bankImportItemId: selectedItem.id,
                      action: "criar_novo",
                    })
                  }
                  disabled={isReconciling}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Criar lançamento
                </button>
                <button
                  onClick={() =>
                    runReconcile({
                      bankImportItemId: selectedItem.id,
                      action: "ignorar",
                    })
                  }
                  disabled={isReconciling}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:text-(--fg) transition-colors disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                  Ignorar
                </button>
              </div>
            </div>
          )}

          <div
            className="border-t border-(--border)"
            style={{ maxHeight: 320, overflowY: "auto" }}
          >
            {transactions.slice(0, 30).map((t) => (
              <div
                key={t.id}
                className="grid gap-2.5 px-4 py-3 border-b border-(--divider) text-sm"
                style={{ gridTemplateColumns: "88px 1fr 110px" }}
              >
                <span className="text-xs text-(--fg-muted) tabular-nums self-center">
                  {fmtDate(t.occurredAt)}
                </span>
                <p className="font-semibold text-(--fg) truncate self-center">
                  {t.description}
                </p>
                <span
                  className={clsx(
                    "self-center text-right font-bold tabular-nums",
                    t.type === "credito"
                      ? "text-(--hb-green-deep)"
                      : "text-(--hb-orange-deep)",
                  )}
                >
                  {t.type === "credito" ? "+" : "−"} {fmtBRL(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ignoredCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-(--fg-muted)">
          <AlertCircle className="h-3.5 w-3.5" />
          {ignoredCount}{" "}
          {ignoredCount === 1 ? "linha ignorada" : "linhas ignoradas"} nesta
          importação.
        </p>
      )}

      {/* Complete state */}
      {unmatched.length === 0 && total > 0 && (
        <div className="rounded-(--radius) border border-(--hb-green-muted) bg-(--hb-green-muted) px-6 py-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--hb-green) text-(--hb-blue)">
            <Check className="h-6 w-6" />
          </div>
          <p
            className="text-lg font-bold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Conciliação completa
          </p>
          <p className="text-sm text-(--fg-muted) max-w-xs">
            Tudo o que fizerdes, fazei-o de coração, como ao Senhor, e não aos
            homens.
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
            Colossenses 3:23
          </p>
        </div>
      )}
    </div>
  );
}
