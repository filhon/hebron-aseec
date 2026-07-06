"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, AlertCircle, RotateCcw } from "lucide-react";
import {
  createReversalSchema,
  type CreateReversalInput,
} from "@hebron/validators";
import { createReversal } from "../actions/transactions";
import type { Transaction } from "@hebron/types/financeiro";

interface ReversalFormProps {
  transactions: Transaction[];
  /** Pre-select a transaction ID (e.g. when opened from a transaction row) */
  preselectedTransactionId?: string;
  onClose: () => void;
  onSuccess?: () => void;
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
    year: "numeric",
  });
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

export function ReversalForm({
  transactions,
  preselectedTransactionId,
  onClose,
  onSuccess,
}: ReversalFormProps) {
  const router = useRouter();

  // Only non-reversed, non-reversal transactions can be reversed
  const reversibleTransactions = transactions.filter(
    (t) => !t.isReversed && t.reversalOf === null,
  );

  const [selectedTxId, setSelectedTxId] = useState(
    preselectedTransactionId ?? "",
  );

  const selectedTx = reversibleTransactions.find((t) => t.id === selectedTxId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateReversalInput>({
    resolver: zodResolver(createReversalSchema),
    defaultValues: {
      originalTransactionId: preselectedTransactionId ?? "",
    },
  });

  const { execute, isPending, result } = useAction(createReversal, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  function onSubmit(data: CreateReversalInput) {
    execute(data);
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
          <span
            className="flex items-center justify-center w-10 h-10 rounded-(--radius)"
            style={{
              background: "var(--hb-orange-muted)",
              color: "var(--hb-orange-deep)",
            }}
          >
            <RotateCcw className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--hb-orange-deep)" }}
            >
              Estorno
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Estornar lançamento
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

        {/* Imutabilidade warning */}
        <div
          className="flex items-start gap-3 mx-6 mt-5 rounded-(--radius) px-4 py-3"
          style={{ background: "var(--hb-orange-muted)" }}
        >
          <AlertTriangle
            className="h-4 w-4 mt-0.5 shrink-0"
            style={{ color: "var(--hb-orange-deep)" }}
          />
          <p className="text-xs leading-relaxed" style={{ color: "var(--fg)" }}>
            <strong>Lançamentos são imutáveis.</strong> O estorno cria dois
            registros: a transação de contrapartida e um log de auditoria. O
            lançamento original permanece no histórico.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="reversal-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            {/* Selecionar transação original */}
            <div>
              <Label required>Transação original</Label>
              <select
                {...register("originalTransactionId")}
                className={inputCls + " appearance-none cursor-pointer"}
                value={selectedTxId}
                onChange={(e) => {
                  setSelectedTxId(e.target.value);
                  setValue("originalTransactionId", e.target.value, {
                    shouldValidate: true,
                  });
                }}
              >
                <option value="">Selecione a transação a estornar</option>
                {reversibleTransactions.slice(0, 20).map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {fmtDate(tx.occurredAt)} · {tx.description.slice(0, 50)} ·{" "}
                    {fmtBRL(tx.amount)}
                  </option>
                ))}
              </select>
              <FieldError message={errors.originalTransactionId?.message} />
            </div>

            {/* Pré-visualização da transação selecionada */}
            {selectedTx ? (
              <div
                className="rounded-(--radius) border p-4 space-y-3"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-alt)",
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Transação selecionada
                </p>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--fg)" }}
                    >
                      {selectedTx.description}
                    </p>
                    <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      {fmtDate(selectedTx.occurredAt)}
                      {selectedTx.categoryId
                        ? ` · ${selectedTx.categoryId}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-lg font-bold tabular-nums"
                      style={{
                        fontFamily: "var(--font-display)",
                        color:
                          selectedTx.type === "credito"
                            ? "var(--hb-green-deep)"
                            : "var(--hb-orange-deep)",
                      }}
                    >
                      {selectedTx.type === "credito" ? "+" : "−"}
                      {fmtBRL(selectedTx.amount)}
                    </p>
                    <span
                      className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                      style={{
                        background:
                          selectedTx.type === "credito"
                            ? "var(--hb-green-muted)"
                            : "var(--hb-orange-muted)",
                        color:
                          selectedTx.type === "credito"
                            ? "var(--hb-green-deep)"
                            : "var(--hb-orange-deep)",
                      }}
                    >
                      {selectedTx.type === "credito" ? "Crédito" : "Débito"}
                    </span>
                  </div>
                </div>

                {/* O estorno criará */}
                <div
                  className="rounded-lg p-3 mt-2"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    O estorno criará uma contrapartida de
                  </p>
                  <p
                    className="text-base font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color:
                        selectedTx.type === "credito"
                          ? "var(--hb-orange-deep)"
                          : "var(--hb-green-deep)",
                    }}
                  >
                    {selectedTx.type === "credito" ? "−" : "+"}
                    {fmtBRL(selectedTx.amount)}{" "}
                    <span
                      className="text-sm font-normal"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      (
                      {selectedTx.type === "credito"
                        ? "débito de estorno"
                        : "crédito de estorno"}
                      )
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-(--radius) border-2 border-dashed flex flex-col items-center justify-center py-10 text-center"
                style={{ borderColor: "var(--border-strong)" }}
              >
                <RotateCcw
                  className="h-8 w-8 mb-3 opacity-30"
                  style={{ color: "var(--fg-muted)" }}
                />
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Selecione a transação acima
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  O valor será preenchido automaticamente
                </p>
              </div>
            )}

            {/* Motivo do estorno — obrigatório */}
            <div>
              <Label required>Motivo do estorno</Label>
              <textarea
                {...register("reason")}
                rows={4}
                className={inputCls + " resize-none"}
                placeholder="Descreva o motivo do estorno com detalhes suficientes para o audit log. Mínimo 10 caracteres."
              />
              <FieldError message={errors.reason?.message} />
              <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                Obrigatório · mínimo 10 caracteres · registrado no audit trail.
              </p>
            </div>

            {result.serverError && (
              <p
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--hb-orange-deep)" }}
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {result.serverError}
              </p>
            )}
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
            form="reversal-form"
            disabled={isSubmitting || isPending || !selectedTx}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
            style={{
              background: "var(--hb-orange)",
              color: "var(--fg-invert)",
            }}
          >
            {isSubmitting || isPending ? "Processando…" : "Confirmar estorno"}
          </button>
        </div>
      </div>
    </div>
  );
}
