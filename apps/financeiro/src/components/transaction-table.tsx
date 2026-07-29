"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  MoreHorizontal,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Paperclip,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import type {
  Transaction,
  AccountCategory,
  BankAccount,
  TransactionType,
} from "@hebron/types/financeiro";
import type { CostCenterOption } from "../lib/queries";
import { csvField, downloadCsv } from "../lib/export-csv";
import { ExpenseForm } from "./expense-form";
import { RevenueForm } from "./revenue-form";
import { ReversalForm } from "./reversal-form";
import { getAttachmentUrl } from "../actions/attachments";

interface TransactionTableProps {
  transactions: Transaction[];
  categories: AccountCategory[];
  accounts: BankAccount[];
  costCenters: CostCenterOption[];
}

const PAGE_SIZE = 20;

type SortKey = "occurredAt" | "amount" | "description";
type SortDir = "asc" | "desc";

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

/** Janela deslizante de páginas ao redor da corrente, com 1 e a última sempre visíveis. */
function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  const delta = 2;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const items: (number | "ellipsis")[] = [1];
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < total - 1) items.push("ellipsis");
  if (total > 1) items.push(total);
  return items;
}

type FormMode = null | "despesa" | "receita" | "estorno";

export function TransactionTable({
  transactions,
  categories,
  accounts,
  costCenters,
}: TransactionTableProps) {
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [reversalTxId, setReversalTxId] = useState<string | undefined>(
    undefined,
  );
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const { execute: openAttachment, isPending: isOpeningAttachment } = useAction(
    getAttachmentUrl,
    {
      onSuccess({ data }) {
        if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
      },
      onError({ error }) {
        setAttachmentError(
          error.serverError ?? "Não foi possível abrir o comprovante.",
        );
      },
    },
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "occurredAt",
    dir: "desc",
  });

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const acctMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a.bank])),
    [accounts],
  );
  const ccMap = useMemo(
    () => Object.fromEntries(costCenters.map((c) => [c.id, c.code])),
    [costCenters],
  );

  const filtered = useMemo(() => {
    let rows = [...transactions];

    if (typeFilter !== "all") {
      rows = rows.filter((t) => t.type === typeFilter);
    }
    if (accountFilter !== "all") {
      rows = rows.filter((t) => t.bankAccountId === accountFilter);
    }
    if (categoryFilter !== "all") {
      rows = rows.filter((t) => t.categoryId === categoryFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((t) => t.occurredAt >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((t) => t.occurredAt <= to);
    }
    if (amountMin !== "") {
      const min = parseFloat(amountMin);
      if (!isNaN(min)) rows = rows.filter((t) => t.amount >= min);
    }
    if (amountMax !== "") {
      const max = parseFloat(amountMax);
      if (!isNaN(max)) rows = rows.filter((t) => t.amount <= max);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.categoryId && catMap[t.categoryId]?.toLowerCase().includes(q)),
      );
    }

    rows.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "occurredAt") {
        cmp = a.occurredAt.getTime() - b.occurredAt.getTime();
      } else if (sort.key === "amount") {
        cmp = a.amount - b.amount;
      } else {
        cmp = a.description.localeCompare(b.description, "pt-BR");
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [
    transactions,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    search,
    sort,
    catMap,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIn = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "credito")
        .reduce((s, t) => s + t.amount, 0),
    [filtered],
  );
  const totalOut = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "debito")
        .reduce((s, t) => s + t.amount, 0),
    [filtered],
  );

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
    setPage(1);
  };

  const resetFilters = () => {
    setAccountFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setPage(1);
  };

  const exportCsv = useCallback(() => {
    const header = [
      "Data",
      "Descrição",
      "Categoria",
      "Centro de Custo",
      "Conta",
      "Tipo",
      "Valor (R$)",
    ];
    const rows = filtered.map((t) => [
      fmtDate(t.occurredAt),
      csvField(t.description),
      t.categoryId ? csvField(catMap[t.categoryId] ?? "") : "",
      t.costCenterId ? (ccMap[t.costCenterId] ?? "") : "",
      acctMap[t.bankAccountId] ?? "",
      t.type === "credito" ? "Entrada" : "Saída",
      ((t.type === "credito" ? 1 : -1) * t.amount).toFixed(2),
    ]);
    downloadCsv(
      `lancamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      header,
      rows,
    );
  }, [filtered, catMap, ccMap, acctMap]);

  const closeReversalForm = () => {
    setFormMode(null);
    setReversalTxId(undefined);
  };

  const SortIndicator = ({ k }: { k: SortKey }) =>
    sort.key === k ? (
      sort.dir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : null;

  return (
    <>
      <div className="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
        {attachmentError && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-(--border) bg-(--color-destructive-muted) text-xs font-medium text-(--color-destructive)">
            {attachmentError}
            <button
              onClick={() => setAttachmentError(null)}
              className="shrink-0 hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {/* ── Toolbar ─────────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-(--border)">
          {/* Search */}
          <label className="flex items-center gap-2 rounded-full border border-(--border) bg-(--bg-alt) px-3 py-1.5 flex-1 min-w-0 max-w-xs focus-within:border-(--border-strong) focus-within:bg-(--bg) transition-colors">
            <Search className="h-3.5 w-3.5 text-(--fg-muted) shrink-0" />
            <input
              className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-(--fg-muted)"
              placeholder="Buscar por descrição ou categoria…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="text-(--fg-muted) hover:text-(--fg) transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </label>

          {/* Type chips */}
          <div className="flex gap-1.5">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "credito", label: "Entradas" },
                { id: "debito", label: "Saídas" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setTypeFilter(f.id);
                  setPage(1);
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                  typeFilter === f.id
                    ? "bg-(--hb-blue) text-(--fg-invert)"
                    : "border border-(--border) text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg)",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
              showFilters
                ? "bg-(--hb-blue) text-(--fg-invert) border-(--hb-blue)"
                : "border-(--border) text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg)",
            )}
          >
            <Filter className="h-3 w-3" />
            Filtros
          </button>

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors"
            >
              <Download className="h-3 w-3" />
              Exportar
            </button>
            <div className="relative">
              <button
                onClick={() => setNewMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors"
              >
                <Plus className="h-3 w-3" />
                Novo lançamento
                <ChevronDown className="h-3 w-3" />
              </button>
              {newMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-44 rounded-(--radius) border py-1 z-20 bg-(--bg) border-(--border)"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
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
                        setNewMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-(--fg) transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {(newMenuOpen || openRowMenu) && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setNewMenuOpen(false);
              setOpenRowMenu(null);
            }}
          />
        )}

        {/* ── Advanced filters ──────────────────────────────────────────────────── */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-(--border) bg-(--bg-alt)">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Conta
              </span>
              <select
                className="rounded-lg border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--fg) outline-none focus:border-(--hb-blue) transition-colors"
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todas as contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Categoria
              </span>
              <select
                className="rounded-lg border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--fg) outline-none focus:border-(--hb-blue) transition-colors"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todas as categorias</option>
                {categories
                  .filter((c) => c.level === 3)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                De
              </span>
              <input
                type="date"
                className="rounded-lg border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--fg) outline-none focus:border-(--hb-blue) transition-colors"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Até
              </span>
              <input
                type="date"
                className="rounded-lg border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--fg) outline-none focus:border-(--hb-blue) transition-colors"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Valor
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Mín"
                className="w-24 rounded-lg border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--fg) outline-none focus:border-(--hb-blue) transition-colors placeholder:text-(--fg-muted)"
                value={amountMin}
                onChange={(e) => {
                  setAmountMin(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-(--fg-muted) text-xs">–</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Máx"
                className="w-24 rounded-lg border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--fg) outline-none focus:border-(--hb-blue) transition-colors placeholder:text-(--fg-muted)"
                value={amountMax}
                onChange={(e) => {
                  setAmountMax(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {(accountFilter !== "all" ||
              categoryFilter !== "all" ||
              dateFrom !== "" ||
              dateTo !== "" ||
              amountMin !== "" ||
              amountMax !== "") && (
              <button
                onClick={resetFilters}
                className="text-xs text-(--hb-orange-deep) font-semibold hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Summary strip ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 px-4 py-2 border-b border-(--border) bg-(--bg-alt) text-xs">
          <span className="text-(--fg-muted)">
            {filtered.length} lançamentos
          </span>
          <span className="flex items-center gap-1 text-(--hb-green-deep) font-semibold">
            <ArrowUpRight className="h-3 w-3" />
            {fmtBRL(totalIn)}
          </span>
          <span className="flex items-center gap-1 text-(--hb-orange-deep) font-semibold">
            <ArrowDownRight className="h-3 w-3" />
            {fmtBRL(totalOut)}
          </span>
          <span
            className={clsx(
              "font-bold",
              totalIn - totalOut >= 0
                ? "text-(--hb-blue)"
                : "text-(--color-destructive)",
            )}
          >
            Resultado: {fmtBRL(totalIn - totalOut)}
          </span>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────────── */}
        <div
          className="overflow-x-auto"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          >
            <thead>
              <tr>
                {[
                  {
                    label: "Data",
                    key: "occurredAt" as SortKey,
                    align: "left",
                    w: "w-20",
                  },
                  {
                    label: "Descrição",
                    key: "description" as SortKey,
                    align: "left",
                  },
                  { label: "Categoria", key: null, align: "left", w: "w-40" },
                  { label: "Conta", key: null, align: "left", w: "w-28" },
                  { label: "Status", key: null, align: "left", w: "w-28" },
                  {
                    label: "Valor",
                    key: "amount" as SortKey,
                    align: "right",
                    w: "w-32",
                  },
                  { label: "", key: null, align: "left", w: "w-8" },
                ].map(({ label, key, align, w }) => (
                  <th
                    key={label || "actions"}
                    onClick={() => key && toggleSort(key)}
                    className={clsx(
                      "sticky top-0 z-10 bg-(--bg) border-b border-(--border)",
                      "text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)",
                      "px-3 py-2.5",
                      align === "right" ? "text-right" : "text-left",
                      key ? "cursor-pointer hover:text-(--fg) select-none" : "",
                      w,
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {key && <SortIndicator k={key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paged.map((t) => {
                const isCredit = t.type === "credito";
                const isReconciled = !!t.reconciledAt;
                const isReversible = !t.isReversed && t.reversalOf === null;
                const attachmentRef: {
                  refType: "payable" | "receivable";
                  refId: string;
                } | null = t.payableId
                  ? { refType: "payable", refId: t.payableId }
                  : t.receivableId
                    ? { refType: "receivable", refId: t.receivableId }
                    : null;

                return (
                  <tr
                    key={t.id}
                    className="group hover:bg-[rgba(32,44,133,0.025)] transition-colors"
                  >
                    <td className="px-3 py-3.5 border-b border-(--divider) text-(--fg-muted) text-xs tabular-nums whitespace-nowrap">
                      {fmtDate(t.occurredAt)}
                    </td>

                    <td className="px-3 py-3.5 border-b border-(--divider)">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-(--fg) leading-tight">
                          {t.description}
                        </span>
                        {t.isReversed && (
                          <span className="text-[10px] font-bold uppercase bg-(--hb-orange-muted) text-(--hb-orange-deep) px-1.5 py-0.5 rounded">
                            Estornado
                          </span>
                        )}
                        {t.reversalOf && (
                          <span className="text-[10px] font-bold uppercase bg-(--hb-cyan-muted) text-(--hb-cyan-deep) px-1.5 py-0.5 rounded">
                            Estorno
                          </span>
                        )}
                      </div>
                      {t.costCenterId && (
                        <div className="text-xs text-(--hb-blue) font-semibold mt-0.5">
                          {ccMap[t.costCenterId]}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3.5 border-b border-(--divider) text-(--fg-muted) text-xs">
                      {t.categoryId ? (catMap[t.categoryId] ?? "—") : "—"}
                    </td>

                    <td className="px-3 py-3.5 border-b border-(--divider) text-(--fg-muted) text-xs whitespace-nowrap">
                      {acctMap[t.bankAccountId] ?? "—"}
                    </td>

                    <td className="px-3 py-3.5 border-b border-(--divider)">
                      {isReconciled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-(--hb-green-muted) text-(--hb-green-deep)">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          Conciliado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-(--surface-alt) text-(--fg-muted)">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          Pendente
                        </span>
                      )}
                    </td>

                    <td
                      className={clsx(
                        "px-3 py-3.5 border-b border-(--divider) text-right font-bold tabular-nums text-sm whitespace-nowrap",
                        isCredit
                          ? "text-(--hb-green-deep)"
                          : "text-(--hb-orange-deep)",
                      )}
                    >
                      {isCredit ? "+" : "−"} {fmtBRL(t.amount)}
                    </td>

                    <td className="px-3 py-3.5 border-b border-(--divider)">
                      {(isReversible || attachmentRef) && (
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setOpenRowMenu((id) =>
                                id === t.id ? null : t.id,
                              )
                            }
                            aria-label="Mais ações"
                            className={clsx(
                              "transition-opacity h-7 w-7 flex items-center justify-center rounded-lg text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface-alt)",
                              openRowMenu === t.id
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100",
                            )}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {openRowMenu === t.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-48 rounded-(--radius) border py-1 z-20 bg-(--bg) border-(--border)"
                              style={{
                                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                              }}
                            >
                              {attachmentRef && (
                                <button
                                  onClick={() => {
                                    setAttachmentError(null);
                                    openAttachment(attachmentRef);
                                    setOpenRowMenu(null);
                                  }}
                                  disabled={isOpeningAttachment}
                                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-semibold text-(--fg) hover:bg-(--surface-alt) transition-colors disabled:opacity-60"
                                >
                                  <Paperclip className="h-3.5 w-3.5 text-(--fg-muted)" />
                                  Ver comprovante
                                </button>
                              )}
                              {isReversible && (
                                <button
                                  onClick={() => {
                                    setReversalTxId(t.id);
                                    setFormMode("estorno");
                                    setOpenRowMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-semibold text-(--fg) hover:bg-(--surface-alt) transition-colors"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 text-(--fg-muted)" />
                                  Estornar lançamento
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-(--fg-muted) text-sm italic"
                  >
                    Nenhum lançamento para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-(--border) text-xs text-(--fg-muted)">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-(--border) disabled:opacity-40 hover:bg-(--surface-alt) transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {pageWindow(page, totalPages).map((p, i) =>
                p === "ellipsis" ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="h-7 w-7 flex items-center justify-center text-(--fg-muted)"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      "h-7 w-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                      page === p
                        ? "bg-(--hb-blue) text-(--fg-invert)"
                        : "border border-(--border) hover:bg-(--surface-alt)",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-(--border) disabled:opacity-40 hover:bg-(--surface-alt) transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

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
          bankAccounts={accounts}
          onClose={() => setFormMode(null)}
        />
      )}
      {formMode === "estorno" && (
        <ReversalForm
          transactions={transactions}
          preselectedTransactionId={reversalTxId}
          onClose={closeReversalForm}
        />
      )}
    </>
  );
}
