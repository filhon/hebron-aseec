"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown,
  Grid3x3,
  List,
} from "lucide-react";
import { createBudgetSchema, type CreateBudgetInput } from "@hebron/validators";
import { createBudget } from "../actions/categories";
import type { AccountCategory } from "@hebron/types/financeiro";
import type { CostCenterOption } from "../lib/queries";

interface BudgetFormProps {
  categories: AccountCategory[];
  costCenters: CostCenterOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTH_OPTIONS = [
  { value: "", label: "Anual (sem mês específico)" },
  ...MONTHS.map((m, i) => ({
    value: String(i + 1),
    label: `${String(i + 1).padStart(2, "0")} — ${m}`,
  })),
];

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="flex items-center gap-1 text-xs font-medium mt-1"
      style={{ color: "var(--hb-orange-deep)" }}
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
      {required && (
        <span className="ml-0.5" style={{ color: "var(--hb-orange-deep)" }}>
          *
        </span>
      )}
    </label>
  );
}

const inputCls = [
  "w-full px-3 py-2.5 rounded-(--radius) border text-sm transition-colors outline-none",
  "border-(--border) bg-(--bg) text-(--fg)",
  "placeholder:text-(--fg-muted)",
  "focus:border-(--hb-blue) focus:ring-2 focus:ring-(--hb-blue)/10",
].join(" ");

const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

type ViewMode = "lista" | "matriz";

export function BudgetForm({
  categories,
  costCenters,
  onClose,
  onSuccess,
}: BudgetFormProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const router = useRouter();

  const expenseLeafCategories = categories.filter(
    (c) => c.type === "despesa" && c.level === 3,
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      name: "",
      year: new Date().getFullYear(),
      projectId: null,
      costCenterId: null,
      items: [
        {
          categoryId: "",
          description: "",
          plannedAmount: 0,
          month: null,
          notes: null,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchItems = watch("items");

  const totalPlanned = watchItems.reduce((s, item) => {
    const v = typeof item.plannedAmount === "number" ? item.plannedAmount : 0;
    return s + v;
  }, 0);

  // Matrix view: category rows × month columns
  // Groups items by categoryId, sums months
  const matrixData = expenseLeafCategories.slice(0, 6).map((cat) => {
    const monthlyAmounts: Record<number, number> = {};
    watchItems
      .filter((it) => it.categoryId === cat.id)
      .forEach((it) => {
        const m = typeof it.month === "number" ? it.month : 0;
        monthlyAmounts[m] = (monthlyAmounts[m] ?? 0) + (it.plannedAmount ?? 0);
      });
    const annual = Object.values(monthlyAmounts).reduce((s, v) => s + v, 0);
    return { cat, monthlyAmounts, annual };
  });

  const { execute, isPending, result } = useAction(createBudget, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  function onSubmit(data: CreateBudgetInput) {
    execute(data);
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "rgba(19,23,55,0.42)" }}
      onClick={onClose}
    >
      <div
        className="w-200 max-w-full flex flex-col h-full"
        style={{
          background: "var(--bg)",
          animation: "slide-in 220ms var(--ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--hb-blue)" }}
            >
              Orçamento
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Novo orçamento anual
            </p>
          </div>

          {/* View toggle */}
          <div
            className="flex p-1 rounded-(--radius)"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {(
              [
                {
                  id: "lista",
                  icon: <List className="h-3.5 w-3.5" />,
                  label: "Lista",
                },
                {
                  id: "matriz",
                  icon: <Grid3x3 className="h-3.5 w-3.5" />,
                  label: "Matriz",
                },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background:
                    viewMode === v.id ? "var(--hb-blue)" : "transparent",
                  color:
                    viewMode === v.id ? "var(--fg-invert)" : "var(--fg-muted)",
                }}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-(--radius) transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <form id="budget-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Header fields */}
            <div
              className="px-6 py-5 border-b space-y-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label required>Nome do orçamento</Label>
                  <input
                    {...register("name")}
                    className={inputCls}
                    placeholder="Ex: Orçamento Operacional 2027"
                  />
                  <FieldError message={errors.name?.message} />
                </div>
                <div>
                  <Label required>Ano</Label>
                  <input
                    {...register("year", { valueAsNumber: true })}
                    type="number"
                    min="2020"
                    max="2100"
                    className={inputCls}
                    placeholder="2027"
                  />
                  <FieldError message={errors.year?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Label>Centro de custo</Label>
                  <select {...register("costCenterId")} className={selectCls}>
                    <option value="">Sem centro de custo</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-9 h-3.5 w-3.5 pointer-events-none"
                    style={{ color: "var(--fg-muted)" }}
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <div
                    className="w-full rounded-(--radius) px-4 py-3 text-right"
                    style={{ background: "var(--hb-blue)" }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      Total planejado
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums mt-0.5"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--fg-invert)",
                      }}
                    >
                      {fmtBRL(totalPlanned)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items — lista view */}
            {viewMode === "lista" && (
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p
                    className="text-sm font-bold"
                    style={{ color: "var(--fg)" }}
                  >
                    Itens do orçamento
                  </p>
                  {errors.items?.root && (
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--hb-orange-deep)" }}
                    >
                      {errors.items.root.message}
                    </p>
                  )}
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1fr_120px_28px] gap-3 px-1">
                  {["Categoria", "Descrição / mês", "Valor (R$)", ""].map(
                    (h) => (
                      <p
                        key={h}
                        className="text-[10px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {h}
                      </p>
                    ),
                  )}
                </div>

                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_1fr_120px_28px] gap-3 items-start"
                  >
                    {/* Categoria */}
                    <div className="relative">
                      <select
                        {...register(`items.${idx}.categoryId`)}
                        className={selectCls + " text-xs py-2"}
                      >
                        <option value="">Selecionar…</option>
                        {expenseLeafCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.code} {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-2.5 top-2.5 h-3 w-3 pointer-events-none"
                        style={{ color: "var(--fg-muted)" }}
                      />
                      <FieldError
                        message={errors.items?.[idx]?.categoryId?.message}
                      />
                    </div>

                    {/* Descrição + mês */}
                    <div className="space-y-1.5">
                      <input
                        {...register(`items.${idx}.description`)}
                        className={inputCls + " text-xs py-2"}
                        placeholder="Descrição"
                      />
                      <div className="relative">
                        <select
                          {...register(`items.${idx}.month`, {
                            setValueAs: (v) =>
                              v === "" ? null : parseInt(v, 10),
                          })}
                          className={selectCls + " text-xs py-1.5"}
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2.5 top-2 h-3 w-3 pointer-events-none"
                          style={{ color: "var(--fg-muted)" }}
                        />
                      </div>
                    </div>

                    {/* Valor */}
                    <div>
                      <input
                        {...register(`items.${idx}.plannedAmount`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.01"
                        min="0.01"
                        className={
                          inputCls + " text-xs py-2 text-right tabular-nums"
                        }
                        placeholder="0,00"
                      />
                      <FieldError
                        message={errors.items?.[idx]?.plannedAmount?.message}
                      />
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      disabled={fields.length === 1}
                      className="flex items-center justify-center w-7 h-9 rounded-lg transition-colors disabled:opacity-30"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    append({
                      categoryId: "",
                      description: "",
                      plannedAmount: 0,
                      month: null,
                      notes: null,
                    })
                  }
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-(--radius) border-2 border-dashed text-sm font-semibold transition-colors"
                  style={{
                    borderColor: "var(--border-strong)",
                    color: "var(--fg-muted)",
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar item
                </button>
              </div>
            )}

            {/* Items — matriz view (category × month grid) */}
            {viewMode === "matriz" && (
              <div className="px-6 py-5">
                <p
                  className="text-sm font-bold mb-4"
                  style={{ color: "var(--fg)" }}
                >
                  Distribuição mensal — categorias × meses
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--fg-muted)" }}
                >
                  A visão de matriz mostra as categorias com valores já
                  inseridos na lista. Edite os itens na aba Lista.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="w-full text-xs"
                    style={{
                      borderCollapse: "separate",
                      borderSpacing: 0,
                      minWidth: 900,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          className="text-left px-3 py-2.5 border-b"
                          style={{
                            background: "var(--bg)",
                            borderColor: "var(--border)",
                            color: "var(--fg-muted)",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            minWidth: 180,
                          }}
                        >
                          Categoria
                        </th>
                        {MONTHS.map((m) => (
                          <th
                            key={m}
                            className="px-2 py-2.5 border-b text-right"
                            style={{
                              background: "var(--bg)",
                              borderColor: "var(--border)",
                              color: "var(--fg-muted)",
                              fontSize: 10,
                              fontWeight: 700,
                              width: 70,
                            }}
                          >
                            {m}
                          </th>
                        ))}
                        <th
                          className="px-3 py-2.5 border-b text-right"
                          style={{
                            background: "var(--bg)",
                            borderColor: "var(--border)",
                            color: "var(--fg)",
                            fontSize: 10,
                            fontWeight: 700,
                            width: 90,
                          }}
                        >
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.map(({ cat, monthlyAmounts, annual }) => (
                        <tr
                          key={cat.id}
                          style={{ borderBottom: "1px solid var(--divider)" }}
                        >
                          <td
                            className="px-3 py-3 font-semibold"
                            style={{ color: "var(--fg)" }}
                          >
                            <span
                              className="text-[10px] font-bold mr-1.5 tabular-nums"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              {cat.code}
                            </span>
                            {cat.name}
                          </td>
                          {Array.from({ length: 12 }, (_, i) => {
                            const val = monthlyAmounts[i + 1] ?? 0;
                            return (
                              <td
                                key={i}
                                className="px-2 py-3 text-right tabular-nums"
                                style={{
                                  color:
                                    val > 0 ? "var(--fg)" : "var(--fg-muted)",
                                  background:
                                    val > 0
                                      ? "rgba(32,44,133,0.03)"
                                      : "transparent",
                                  fontSize: 11,
                                }}
                              >
                                {val > 0 ? fmtBRL(val).replace("R$ ", "") : "—"}
                              </td>
                            );
                          })}
                          <td
                            className="px-3 py-3 text-right font-bold tabular-nums"
                            style={{
                              color:
                                annual > 0
                                  ? "var(--hb-blue)"
                                  : "var(--fg-muted)",
                              fontSize: 12,
                            }}
                          >
                            {annual > 0 ? fmtBRL(annual) : "—"}
                          </td>
                        </tr>
                      ))}

                      {/* Total row */}
                      <tr style={{ borderTop: "2px solid var(--border)" }}>
                        <td
                          className="px-3 py-3 font-bold text-xs uppercase tracking-widest"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          Total mensal
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const monthTotal = matrixData.reduce(
                            (s, { monthlyAmounts }) =>
                              s + (monthlyAmounts[i + 1] ?? 0),
                            0,
                          );
                          return (
                            <td
                              key={i}
                              className="px-2 py-3 text-right font-bold tabular-nums text-xs"
                              style={{ color: "var(--fg)" }}
                            >
                              {monthTotal > 0
                                ? fmtBRL(monthTotal).replace("R$ ", "")
                                : "—"}
                            </td>
                          );
                        })}
                        <td
                          className="px-3 py-3 text-right font-bold tabular-nums"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: "var(--hb-blue)",
                            fontSize: 13,
                          }}
                        >
                          {fmtBRL(totalPlanned)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bar chart preview */}
                <div className="mt-6 space-y-3">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Distribuição por categoria
                  </p>
                  {matrixData
                    .filter((d) => d.annual > 0)
                    .map(({ cat, annual }) => {
                      const pct =
                        totalPlanned > 0 ? (annual / totalPlanned) * 100 : 0;
                      return (
                        <div key={cat.id} className="flex items-center gap-3">
                          <div
                            className="w-40 text-xs font-medium truncate"
                            style={{ color: "var(--fg)" }}
                          >
                            {cat.name}
                          </div>
                          <div
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ background: "var(--surface-alt)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: "var(--hb-blue)",
                              }}
                            />
                          </div>
                          <div
                            className="text-xs font-bold tabular-nums w-28 text-right"
                            style={{ color: "var(--hb-blue)" }}
                          >
                            {fmtBRL(annual)}
                          </div>
                          <div
                            className="text-[10px] tabular-nums w-10 text-right"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            {pct.toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  {matrixData.every((d) => d.annual === 0) && (
                    <p
                      className="text-sm text-center py-8"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Adicione itens na aba Lista para visualizar a
                      distribuição.
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {fields.length} {fields.length === 1 ? "item" : "itens"} · total{" "}
            <strong style={{ color: "var(--fg)" }}>
              {fmtBRL(totalPlanned)}
            </strong>
            {result.serverError && (
              <span
                className="block mt-1 text-xs font-medium"
                style={{ color: "var(--hb-orange-deep)" }}
              >
                {result.serverError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="budget-form"
              disabled={isSubmitting || isPending}
              className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              {isSubmitting || isPending ? "Salvando…" : "Criar orçamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
