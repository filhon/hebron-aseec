"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { approveBatch, authorizeBatch } from "../actions/approval";
import type { BatchApproval, Payable } from "@hebron/types/financeiro";

interface BatchApprovalFormProps {
  batch: BatchApproval;
  /** Camada de governança que este diálogo executa (BRAIN §6.5) */
  stage: "aprovar" | "autorizar";
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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getDueCls(dueAt: Date): { bg: string; color: string } {
  const diff = Math.ceil((dueAt.getTime() - Date.now()) / 86_400_000);
  if (diff < 0)
    return {
      bg: "var(--color-destructive-muted)",
      color: "var(--color-destructive)",
    };
  if (diff <= 3)
    return { bg: "var(--hb-orange-muted)", color: "var(--hb-orange-deep)" };
  return { bg: "var(--hb-green-muted)", color: "var(--hb-green-deep)" };
}

function PayableRow({ payable }: { payable: Payable }) {
  const due = getDueCls(payable.dueAt);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-(--radius) border"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
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

const STAGE_COPY = {
  aprovar: {
    eyebrow: "1ª camada · Diretor Gestor",
    title: "Aprovar lote de pagamentos",
    reminder:
      "Você é o Diretor Gestor (1ª camada). Após aprovação, o Diretor Autorizador — pessoa diferente — realiza a 2ª camada. O sistema bloqueia o mesmo usuário nas duas etapas.",
    cta: "Aprovar lote",
    pendingCta: "Aprovando…",
  },
  autorizar: {
    eyebrow: "2ª camada · Diretor Autorizador",
    title: "Autorizar lote de pagamentos",
    reminder:
      "Você é o Diretor Autorizador (2ª camada). O sistema bloqueia a autorização se você também aprovou este lote como Diretor Gestor.",
    cta: "Autorizar lote",
    pendingCta: "Autorizando…",
  },
} as const;

export function BatchApprovalForm({
  batch,
  stage,
  onClose,
  onSuccess,
}: BatchApprovalFormProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const copy = STAGE_COPY[stage];

  const approveActionState = useAction(approveBatch, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });
  const authorizeActionState = useAction(authorizeBatch, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  const { execute, isPending, result } =
    stage === "aprovar" ? approveActionState : authorizeActionState;

  const batchCode = `L-${batch.weekStart.getFullYear()}-${String(batch.weekStart.getMonth() + 1).padStart(2, "0")}${String(Math.ceil(batch.weekStart.getDate() / 7)).padStart(2, "0")}`;

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
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--hb-orange-deep)" }}
            >
              {batchCode} · {copy.eyebrow}
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {copy.title}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
              <strong>Governança dual.</strong> {copy.reminder}
            </p>
          </div>

          {/* Payables list */}
          <div
            className="rounded-(--radius) border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{
                background: "var(--bg-alt)",
                borderColor: "var(--border)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--fg-muted)" }}
              >
                {batch.payables.length} pagamentos no lote
              </span>
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
                {batch.payables.map((p) => (
                  <PayableRow key={p.id} payable={p} />
                ))}
              </div>
            )}

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
                Total do lote
              </span>
              <span
                className="text-lg font-bold tabular-nums"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                {fmtBRL(batch.totalAmount)}
              </span>
            </div>
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
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
            {batch.payables.length} pagamentos · {fmtBRL(batch.totalAmount)}
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
              type="button"
              onClick={() => execute({ batchId: batch.id })}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              <Check className="h-4 w-4" />
              {isPending ? copy.pendingCta : copy.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
