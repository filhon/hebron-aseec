"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ChevronDown, AlertCircle } from "lucide-react";
import { createReceivableSchema } from "@hebron/validators";
import {
  mockCategories,
  mockCostCenters,
  mockBankAccounts,
} from "../lib/mock-data";
import type { AccountCategory } from "@hebron/types/financeiro";

interface RevenueFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function buildCategoryOptions(
  categories: AccountCategory[],
  type: "receita" | "despesa",
) {
  const filtered = categories.filter((c) => c.type === type);
  const result: { id: string; label: string; disabled: boolean }[] = [];

  function walk(parentId: string | null, depth: number) {
    const children = filtered
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.code.localeCompare(b.code));
    for (const cat of children) {
      const prefix = depth === 0 ? "" : depth === 1 ? "— " : "— — ";
      result.push({
        id: cat.id,
        label: `${prefix}${cat.code} ${cat.name}`,
        disabled: cat.level !== 3,
      });
      walk(cat.id, depth + 1);
    }
  }

  for (const root of filtered
    .filter((c) => c.level === 1)
    .sort((a, b) => a.code.localeCompare(b.code))) {
    result.push({
      id: root.id,
      label: `${root.code} ${root.name}`,
      disabled: true,
    });
    walk(root.id, 1);
  }

  return result;
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

export function RevenueForm({ onClose, onSuccess }: RevenueFormProps) {
  const categoryOptions = buildCategoryOptions(mockCategories, "receita");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createReceivableSchema),
    defaultValues: {
      payerCnpj: null,
      costCenterId: null,
      bankAccountId: null,
      notes: null,
    },
  });

  function onSubmit(data: unknown) {
    console.log("Nova receita:", data);
    onSuccess?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "rgba(19,23,55,0.42)" }}
      onClick={onClose}
    >
      <div
        className="w-140 max-w-full flex flex-col h-full"
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
              style={{ color: "var(--hb-green-deep)" }}
            >
              Nova receita
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Registrar recebimento
            </p>
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="revenue-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Descrição */}
            <div>
              <Label required>Descrição</Label>
              <input
                {...register("description")}
                className={inputCls}
                placeholder="Ex: Repasse mensal Hebron Farmacêutica — Jun/2026"
              />
              <FieldError message={errors.description?.message} />
            </div>

            {/* Pagador */}
            <div>
              <Label required>Pagador / Origem</Label>
              <input
                {...register("payerName")}
                className={inputCls}
                placeholder="Nome completo ou razão social"
              />
              <FieldError message={errors.payerName?.message} />
            </div>

            {/* CNPJ + Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ (opcional)</Label>
                <input
                  {...register("payerCnpj")}
                  className={inputCls}
                  placeholder="00000000000000"
                  maxLength={14}
                />
                <FieldError message={errors.payerCnpj?.message} />
              </div>
              <div>
                <Label required>Valor esperado (R$)</Label>
                <input
                  {...register("amount", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={inputCls}
                  placeholder="0,00"
                />
                <FieldError message={errors.amount?.message} />
              </div>
            </div>

            {/* Data de previsão */}
            <div>
              <Label required>Previsão de recebimento</Label>
              <input
                {...register("expectedAt")}
                type="date"
                className={inputCls}
              />
              <FieldError message={errors.expectedAt?.message} />
            </div>

            {/* Categoria */}
            <div className="relative">
              <Label required>Categoria (plano de contas)</Label>
              <select {...register("categoryId")} className={selectCls}>
                <option value="">Selecione uma categoria de receita</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--fg-muted)" }}
              />
              <FieldError message={errors.categoryId?.message} />
            </div>

            {/* Centro de custo + Conta bancária */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Label>Centro de custo</Label>
                <select {...register("costCenterId")} className={selectCls}>
                  <option value="">Sem centro de custo</option>
                  {mockCostCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none"
                  style={{ color: "var(--fg-muted)" }}
                />
              </div>
              <div className="relative">
                <Label>Conta bancária</Label>
                <select {...register("bankAccountId")} className={selectCls}>
                  <option value="">Qualquer conta</option>
                  {mockBankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.bank} — {ba.agency}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none"
                  style={{ color: "var(--fg-muted)" }}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <textarea
                {...register("notes")}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="Contexto adicional sobre este recebimento…"
              />
            </div>

            {/* Info card */}
            <div
              className="flex items-start gap-3 rounded-(--radius) p-4"
              style={{ background: "var(--hb-green-muted)" }}
            >
              <div
                className="flex-1 text-xs"
                style={{ color: "var(--hb-green-deep)" }}
              >
                <strong>Conciliação automática:</strong> após salvar, o sistema
                tentará casar este recebimento com transações bancárias
                importadas de mesmo valor e data.
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
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
            form="revenue-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--hb-green)", color: "var(--hb-blue)" }}
          >
            {isSubmitting ? "Salvando…" : "Registrar receita"}
          </button>
        </div>
      </div>
    </div>
  );
}
