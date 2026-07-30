"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { X, ChevronDown, AlertCircle, ArrowRightLeft } from "lucide-react";
import {
  createTransactionSchema,
  type CreateTransactionInput,
} from "@hebron/validators";
import { createManualTransaction } from "../actions/transactions";
import type { AccountCategory, BankAccount } from "@hebron/types/financeiro";
import type { CostCenterOption } from "../lib/queries";

interface ManualTransactionFormProps {
  bankAccounts: BankAccount[];
  categories: AccountCategory[];
  costCenters: CostCenterOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs font-medium mt-1 text-(--hb-orange-deep)">
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
    <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 text-(--fg-muted)">
      {children}
      {required && <span className="ml-0.5 text-(--hb-orange-deep)">*</span>}
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

export function ManualTransactionForm({
  bankAccounts,
  categories,
  costCenters,
  onClose,
  onSuccess,
}: ManualTransactionFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "debito" as const,
      categoryId: null,
      costCenterId: null,
      payableId: null,
      receivableId: null,
      externalRef: null,
      notes: null,
    },
  });

  const selectedType = watch("type");
  const categoryOptions = categories.filter(
    (c) =>
      c.level === 3 &&
      c.type === (selectedType === "credito" ? "receita" : "despesa"),
  );

  const { execute, isPending, result } = useAction(createManualTransaction, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  function onSubmit(data: CreateTransactionInput) {
    execute(data);
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "var(--overlay)" }}
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
        <div className="flex items-center gap-3 px-6 py-5 border-b border-(--border)">
          <span className="flex items-center justify-center w-10 h-10 rounded-(--radius) bg-(--hb-cyan-muted) text-(--hb-cyan-deep)">
            <ArrowRightLeft className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--hb-cyan-deep)">
              Lançamento manual
            </p>
            <p
              className="text-xl font-bold mt-0.5 text-(--fg)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Registrar no ledger
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-(--radius) text-(--fg-muted) transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-6 mt-5 rounded-(--radius) px-4 py-3 bg-(--bg-alt)">
          <p className="text-xs leading-relaxed text-(--fg)">
            Para lançamentos que não são uma conta a pagar nem a receber —
            tarifa bancária, rendimento de aplicação, transferência entre
            contas. Entra direto no ledger, imutável desde a criação.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="manual-transaction-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {/* Tipo */}
            <div>
              <Label required>Tipo de lançamento</Label>
              <div className="flex p-1 rounded-(--radius) border border-(--border) bg-(--surface) gap-1">
                {(
                  [
                    { value: "debito", label: "Débito (saída)" },
                    { value: "credito", label: "Crédito (entrada)" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setValue("type", opt.value, { shouldValidate: true })
                    }
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background:
                        selectedType === opt.value
                          ? "var(--hb-blue)"
                          : "transparent",
                      color:
                        selectedType === opt.value
                          ? "var(--fg-invert)"
                          : "var(--fg-muted)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div className="mt-4">
              <Label required>Descrição</Label>
              <input
                {...register("description")}
                className={inputCls}
                placeholder="Ex: Tarifa de manutenção de conta — Jun/2026"
              />
              <FieldError message={errors.description?.message} />
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label required>Valor (R$)</Label>
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
              <div>
                <Label required>Data</Label>
                <input
                  {...register("occurredAt")}
                  type="date"
                  className={inputCls}
                />
                <FieldError message={errors.occurredAt?.message} />
              </div>
            </div>

            {/* Conta bancária */}
            <div className="relative mt-4">
              <Label required>Conta bancária</Label>
              <select {...register("bankAccountId")} className={selectCls}>
                <option value="">Selecione a conta</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.bank}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none text-(--fg-muted)" />
              <FieldError message={errors.bankAccountId?.message} />
            </div>

            {/* Categoria */}
            <div className="relative mt-4">
              <Label>Categoria (plano de contas)</Label>
              <select {...register("categoryId")} className={selectCls}>
                <option value="">Sem categoria</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none text-(--fg-muted)" />
            </div>

            {/* Centro de custo */}
            <div className="relative mt-4">
              <Label>Centro de custo</Label>
              <select {...register("costCenterId")} className={selectCls}>
                <option value="">Sem centro de custo</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} — {cc.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none text-(--fg-muted)" />
            </div>

            {/* Observações */}
            <div className="mt-4">
              <Label>Observações</Label>
              <textarea
                {...register("notes")}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="Notas internas sobre este lançamento…"
              />
            </div>

            {result.serverError && (
              <p className="flex items-center gap-1 text-xs font-medium mt-4 text-(--hb-orange-deep)">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {result.serverError}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-(--border)">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold transition-colors border-(--border) text-(--fg)"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="manual-transaction-form"
            disabled={isSubmitting || isPending}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60 bg-(--hb-blue) text-(--fg-invert)"
          >
            {isSubmitting || isPending ? "Salvando…" : "Registrar lançamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
