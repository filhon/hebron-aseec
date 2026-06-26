"use client";

import { useState, useMemo } from "react";
import { Check, Sparkles, X, Plus, Upload } from "lucide-react";
import type {
  BankImport,
  BankImportItem,
  Transaction,
  BankAccount,
} from "@hebron/types/financeiro";

interface ConciliationViewProps {
  bankAccount: BankAccount;
  bankImport: BankImport;
  transactions: Transaction[];
  onMatch?: (bankItemId: string, transactionId: string) => void;
  onUnmatch?: (bankItemId: string) => void;
  onCreateTransaction?: (item: BankImportItem) => void;
  onReimport?: () => void;
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

function dateDiffDays(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function suggestMatch(
  item: BankImportItem,
  transactions: Transaction[],
  matched: Set<string>,
): Transaction | null {
  return (
    transactions.find(
      (t) =>
        !matched.has(t.id) &&
        Math.abs(t.amount - item.amount) < 0.01 &&
        dateDiffDays(t.occurredAt, item.occurredAt) <= 5,
    ) ?? null
  );
}

export function ConciliationView({
  bankAccount,
  bankImport,
  transactions,
  onMatch,
  onUnmatch,
  onCreateTransaction,
  onReimport,
}: ConciliationViewProps) {
  // Local match state: bankItemId → transactionId
  const [matches, setMatches] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const item of bankImport.items) {
      if (item.transactionId) {
        m[item.id] = item.transactionId;
      }
    }
    return m;
  });

  const [selectedBankItemId, setSelectedBankItemId] = useState<string | null>(
    null,
  );

  const matchedTransactionIds = useMemo(
    () => new Set(Object.values(matches)),
    [matches],
  );

  const items = bankImport.items;
  const matchedCount = Object.keys(matches).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((matchedCount / total) * 100) : 0;
  const unmatched = items.filter((i) => !matches[i.id]);

  const selectedItem = selectedBankItemId
    ? items.find((i) => i.id === selectedBankItemId)
    : null;

  const suggestion = useMemo((): Transaction | null => {
    if (!selectedItem || matches[selectedItem.id]) return null;
    return suggestMatch(selectedItem, transactions, matchedTransactionIds);
  }, [selectedItem, matches, transactions, matchedTransactionIds]);

  const handleMatch = (bankItemId: string, txId: string) => {
    setMatches((prev) => ({ ...prev, [bankItemId]: txId }));
    setSelectedBankItemId(null);
    onMatch?.(bankItemId, txId);
  };

  const handleUnmatch = (bankItemId: string) => {
    setMatches((prev) => {
      const { [bankItemId]: _removed, ...rest } = prev;
      return rest;
    });
    onUnmatch?.(bankItemId);
  };

  const acceptAllSuggestions = () => {
    const next = { ...matches };
    for (const item of unmatched) {
      const match = suggestMatch(
        item,
        transactions,
        new Set(Object.values(next)),
      );
      if (match) {
        next[item.id] = match.id;
        onMatch?.(item.id, match.id);
      }
    }
    setMatches(next);
    setSelectedBankItemId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Info card */}
      <div className="rounded-xl border border-(--border) bg-(--surface) px-5 py-4">
        <div className="flex flex-wrap items-center gap-5">
          {/* Account info */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-(--fg-invert) shrink-0"
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

          {/* Circular progress */}
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

      {/* Auto-match hint */}
      {unmatched.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-(--hb-cyan-muted) bg-(--hb-cyan-muted) px-4 py-3">
          <Sparkles className="h-4 w-4 text-(--hb-cyan-deep) shrink-0" />
          <p className="text-sm text-(--fg) flex-1">
            <strong>Sugestões automáticas</strong> · {unmatched.length}{" "}
            {unmatched.length === 1 ? "linha pendente" : "linhas pendentes"}. O
            sistema casa valor + data com lançamentos já registrados.
          </p>
          <button
            onClick={acceptAllSuggestions}
            className="px-3 py-1.5 rounded-lg border border-(--border) bg-(--surface) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors shrink-0"
          >
            Aceitar todas
          </button>
        </div>
      )}

      {/* Split view */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Extrato bancário ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-(--border) bg-(--surface) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Extrato bancário
              </p>
              <p className="font-semibold text-(--fg) text-sm mt-0.5">
                {total} linhas importadas
              </p>
            </div>
            <button
              onClick={onReimport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors"
            >
              <Upload className="h-3 w-3" />
              Re-importar
            </button>
          </div>

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {items.map((item) => {
              const isMatched = !!matches[item.id];
              const isSelected = selectedBankItemId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setSelectedBankItemId(isSelected ? null : item.id)
                  }
                  className={clsx(
                    "grid gap-2.5 px-4 py-3 border-b border-(--divider) cursor-pointer transition-colors text-sm",
                    "hover:bg-(--bg-alt)",
                    isMatched && "opacity-50",
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
                      ) : (
                        <span className="text-(--hb-orange-deep) font-semibold">
                          Pendente
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={clsx(
                        "text-right font-bold tabular-nums text-sm",
                        item.type === "credito"
                          ? "text-(--hb-green-deep)"
                          : "text-(--hb-orange-deep)",
                      )}
                    >
                      {item.type === "credito" ? "+" : "−"}{" "}
                      {fmtBRL(item.amount)}
                    </span>
                    {isMatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmatch(item.id);
                        }}
                        className="h-5 w-5 flex items-center justify-center rounded text-(--fg-muted) hover:text-(--color-destructive) transition-colors"
                        title="Desfazer conciliação"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Lançamentos do sistema ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-(--border) bg-(--surface) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Lançamentos do sistema
              </p>
              <p className="font-semibold text-(--fg) text-sm mt-0.5">
                {transactions.length} no período
              </p>
            </div>
            {onCreateTransaction &&
              selectedItem &&
              !matches[selectedItem.id] && (
                <button
                  onClick={() => onCreateTransaction(selectedItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Criar lançamento
                </button>
              )}
          </div>

          {/* Suggestion panel */}
          {selectedItem && !matches[selectedItem.id] && suggestion && (
            <div className="px-4 py-3 border-b border-(--divider) bg-(--hb-green-muted)">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--hb-green-deep) flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3" />
                    Sugestão para "{selectedItem.description}"
                  </p>
                  <p className="text-sm font-semibold text-(--fg)">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-(--fg-muted) mt-0.5">
                    {suggestion.categoryId ?? "Sem categoria"} ·{" "}
                    {fmtDate(suggestion.occurredAt)} ·{" "}
                    {fmtBRL(suggestion.amount)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedBankItemId(null)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-(--border) bg-(--surface) text-(--fg-muted) hover:text-(--fg) transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleMatch(selectedItem.id, suggestion.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-green) text-(--hb-blue) text-xs font-bold hover:bg-(--hb-green-deep) transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Casar
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-(--fg-muted)">
                Confiança: valor idêntico, data próxima
              </p>
            </div>
          )}

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {transactions.map((t) => {
              const isMatched = matchedTransactionIds.has(t.id);
              const isHighlighted =
                selectedItem &&
                !matches[selectedItem.id] &&
                suggestion?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (
                      selectedItem &&
                      !matches[selectedItem.id] &&
                      !isMatched
                    ) {
                      handleMatch(selectedItem.id, t.id);
                    }
                  }}
                  className={clsx(
                    "grid gap-2.5 px-4 py-3 border-b border-(--divider) text-sm transition-colors",
                    selectedItem && !matches[selectedItem.id] && !isMatched
                      ? "cursor-pointer hover:bg-(--bg-alt)"
                      : "",
                    isMatched && "opacity-50",
                    isHighlighted && "bg-(--hb-green-muted)",
                  )}
                  style={{ gridTemplateColumns: "88px 1fr 110px" }}
                >
                  <span className="text-xs text-(--fg-muted) tabular-nums self-center">
                    {fmtDate(t.occurredAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-(--fg) truncate">
                      {t.description}
                    </p>
                    <p className="text-xs text-(--fg-muted) mt-0.5 truncate">
                      {t.categoryId ? t.categoryId : "Sem categoria"}
                    </p>
                  </div>
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Complete state */}
      {unmatched.length === 0 && total > 0 && (
        <div className="rounded-xl border border-(--hb-green-muted) bg-(--hb-green-muted) px-6 py-8 flex flex-col items-center gap-3 text-center">
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
