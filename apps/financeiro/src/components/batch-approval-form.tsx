"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Check,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  XCircle,
} from "lucide-react";
import { z } from "zod";
import { mockBatchApprovals } from "../lib/mock-data";
import type { Payable } from "@hebron/types/financeiro";

interface BatchApprovalFormProps {
  batchId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const batchActionSchema = z
  .object({
    action: z.enum(["aprovar", "rejeitar"]),
    notes: z.string().max(500).nullable().optional().default(null),
    rejectionReason: z
      .string()
      .min(10, "Informe o motivo da rejeição (mínimo 10 caracteres)")
      .max(500)
      .optional(),
  })
  .refine(
    (d) =>
      d.action !== "rejeitar" ||
      (d.rejectionReason !== undefined && d.rejectionReason.length >= 10),
    {
      message: "Motivo da rejeição obrigatório",
      path: ["rejectionReason"],
    },
  );

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getDueCls(dueAt: Date): { bg: string; color: string } {
  const diff = Math.ceil(
    (dueAt.getTime() - new Date("2026-06-01").getTime()) / 86_400_000,
  );
  if (diff < 0)
    return {
      bg: "var(--color-destructive-muted)",
      color: "var(--color-destructive)",
    };
  if (diff <= 3)
    return { bg: "var(--hb-orange-muted)", color: "var(--hb-orange-deep)" };
  return { bg: "var(--hb-green-muted)", color: "var(--hb-green-deep)" };
}

function PayableCheckRow({
  payable,
  checked,
  onToggle,
}: {
  payable: Payable;
  checked: boolean;
  onToggle: () => void;
}) {
  const due = getDueCls(payable.dueAt);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-(--radius) border transition-colors cursor-pointer"
      style={{
        borderColor: checked ? "var(--hb-blue)" : "var(--border)",
        background: checked ? "rgba(32,44,133,0.04)" : "var(--bg)",
      }}
      onClick={onToggle}
    >
      <span style={{ color: checked ? "var(--hb-blue)" : "var(--fg-muted)" }}>
        {checked ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--fg)" }}
        >
          {payable.description}
        </p>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "var(--fg-muted)" }}
        >
          {payable.supplierName}
          {payable.costCenterId ? ` · ${payable.costCenterId}` : ""}
        </p>
      </div>
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
        style={{ background: due.bg, color: due.color }}
      >
        <Calendar className="h-2.5 w-2.5" />
        {fmtDate(payable.dueAt)}
      </span>
      <span
        className="text-sm font-bold tabular-nums shrink-0"
        style={{ color: "var(--fg)" }}
      >
        {fmtBRL(payable.amount)}
      </span>
    </div>
  );
}

export function BatchApprovalForm({
  batchId,
  onClose,
  onSuccess,
}: BatchApprovalFormProps) {
  const batch = batchId
    ? mockBatchApprovals.find((b) => b.id === batchId)
    : mockBatchApprovals.find((b) => b.status === "pendente");

  const payables = batch?.payables ?? [];

  const [selected, setSelected] = useState<Set<string>>(
    new Set(payables.map((p) => p.id)),
  );
  const [expanded, setExpanded] = useState(true);
  const [action, setAction] = useState<"aprovar" | "rejeitar">("aprovar");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(batchActionSchema),
    defaultValues: { action: "aprovar", notes: null },
  });

  function toggleAll() {
    if (selected.size === payables.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(payables.map((p) => p.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const selectedPayables = payables.filter((p) => selected.has(p.id));
  const totalSelected = selectedPayables.reduce((s, p) => s + p.amount, 0);

  function onSubmit(data: unknown) {
    console.log("Aprovação de lote:", data, "selected:", Array.from(selected));
    onSuccess?.();
    onClose();
  }

  if (!batch) {
    return (
      <div
        className="fixed inset-0 z-(--z-overlay) flex justify-end"
        style={{ background: "rgba(19,23,55,0.42)" }}
        onClick={onClose}
      >
        <div
          className="w-140 max-w-full flex flex-col h-full"
          style={{ background: "var(--bg)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-3 px-6 py-5 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex-1">
              <p
                className="text-xl font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                Aprovação de lote
              </p>
            </div>
            <button onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--fg-muted)" }}
            >
              Nenhum lote pendente de aprovação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const batchCode = `L-${batch.weekStart.getFullYear()}-${String(batch.weekStart.getMonth() + 1).padStart(2, "0")}${String(Math.ceil(batch.weekStart.getDate() / 7)).padStart(2, "0")}`;

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
              style={{ color: "var(--hb-orange-deep)" }}
            >
              {batchCode} · Lote semanal
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Aprovação de pagamentos
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
            id="batch-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            {/* Governance reminder */}
            <div
              className="flex items-start gap-3 rounded-(--radius) px-4 py-3"
              style={{ background: "var(--hb-orange-muted)" }}
            >
              <AlertTriangle
                className="h-4 w-4 mt-0.5 shrink-0"
                style={{ color: "var(--hb-orange-deep)" }}
              />
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--fg)" }}
              >
                <strong>Governança dual.</strong> Você é o Diretor Gestor (1ª
                camada). Após aprovação, o Diretor Autorizador —{" "}
                <strong>pessoa diferente</strong> — realiza a 2ª camada. O
                sistema bloqueia o mesmo usuário nas duas etapas.
              </p>
            </div>

            {/* Payables list */}
            <div
              className="rounded-(--radius) border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {/* Header da lista */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{
                  background: "var(--bg-alt)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    style={{ color: "var(--hb-blue)" }}
                  >
                    {selected.size === payables.length ? (
                      <CheckSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    {selected.size === payables.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {selected.size}/{payables.length} selecionados
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--hb-blue)" }}
                >
                  {expanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {expanded ? "Recolher" : "Expandir"}
                </button>
              </div>

              {expanded && (
                <div
                  className="px-3 py-3 space-y-2"
                  style={{ maxHeight: 320, overflowY: "auto" }}
                >
                  {payables.map((p) => (
                    <PayableCheckRow
                      key={p.id}
                      payable={p}
                      checked={selected.has(p.id)}
                      onToggle={() => toggle(p.id)}
                    />
                  ))}
                </div>
              )}

              {/* Total */}
              <div
                className="flex items-center justify-between px-4 py-3 border-t"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Total selecionado
                </span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--fg)",
                  }}
                >
                  {fmtBRL(totalSelected)}
                </span>
              </div>
            </div>

            {/* Ação */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
                style={{ color: "var(--fg-muted)" }}
              >
                Decisão
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAction("aprovar");
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-(--radius) border-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor:
                      action === "aprovar"
                        ? "var(--hb-green)"
                        : "var(--border)",
                    background:
                      action === "aprovar"
                        ? "var(--hb-green-muted)"
                        : "var(--bg)",
                    color:
                      action === "aprovar"
                        ? "var(--hb-green-deep)"
                        : "var(--fg-muted)",
                  }}
                >
                  <Check className="h-4 w-4" />
                  Aprovar lote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAction("rejeitar");
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-(--radius) border-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor:
                      action === "rejeitar"
                        ? "var(--hb-orange)"
                        : "var(--border)",
                    background:
                      action === "rejeitar"
                        ? "var(--hb-orange-muted)"
                        : "var(--bg)",
                    color:
                      action === "rejeitar"
                        ? "var(--hb-orange-deep)"
                        : "var(--fg-muted)",
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Rejeitar lote
                </button>
              </div>
              <input type="hidden" {...register("action")} value={action} />
            </div>

            {/* Observações */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
                style={{ color: "var(--fg-muted)" }}
              >
                {action === "rejeitar" ? (
                  <>
                    Motivo da rejeição{" "}
                    <span style={{ color: "var(--hb-orange-deep)" }}>*</span>
                  </>
                ) : (
                  "Observações (opcional)"
                )}
              </label>
              <textarea
                {...register(
                  action === "rejeitar" ? "rejectionReason" : "notes",
                )}
                rows={3}
                className={[
                  "w-full px-3 py-2.5 rounded-(--radius) border text-sm transition-colors outline-none resize-none",
                  "border-(--border) bg-(--bg) text-(--fg) placeholder:text-(--fg-muted)",
                  "focus:border-(--hb-blue) focus:ring-2 focus:ring-(--hb-blue)/10",
                ].join(" ")}
                placeholder={
                  action === "rejeitar"
                    ? "Informe o motivo da rejeição para que o lote possa ser corrigido…"
                    : "Notas para o Diretor Autorizador (opcional)…"
                }
              />
              {action === "rejeitar" && errors.rejectionReason && (
                <p
                  className="flex items-center gap-1 text-xs font-medium mt-1"
                  style={{ color: "var(--hb-orange-deep)" }}
                >
                  {errors.rejectionReason.message}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
            {selected.size} de {payables.length} pagamentos ·{" "}
            {fmtBRL(totalSelected)}
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
              form="batch-form"
              disabled={isSubmitting || selected.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
              style={{
                background:
                  action === "aprovar" ? "var(--hb-blue)" : "var(--hb-orange)",
                color: "var(--fg-invert)",
              }}
            >
              {action === "aprovar" ? (
                <>
                  <Check className="h-4 w-4" />
                  {isSubmitting
                    ? "Aprovando…"
                    : `Aprovar ${selected.size} pagamentos`}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {isSubmitting ? "Rejeitando…" : "Rejeitar lote"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
