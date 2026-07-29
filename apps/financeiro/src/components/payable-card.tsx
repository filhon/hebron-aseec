"use client";

import { useState } from "react";
import { Calendar, Link2, Check, Paperclip } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import type { Payable } from "@hebron/types/financeiro";
import { getAttachmentUrl } from "../actions/attachments";

interface PayableCardProps {
  payable: Payable;
  onAction?: (action: "approve" | "authorize" | "pay" | "cancel") => void;
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

function clsx(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

type DueStatus = "overdue" | "urgent" | "soon" | "ok";

function getDueStatus(dueAt: Date): DueStatus {
  const diffDays = Math.ceil((dueAt.getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "urgent";
  if (diffDays <= 7) return "soon";
  return "ok";
}

const DUE_CONFIG: Record<
  DueStatus,
  {
    pill: string;
    band: string;
    label: string;
    daysLabel: (d: number) => string;
  }
> = {
  overdue: {
    pill: "bg-(--color-destructive-muted) text-(--color-destructive)",
    band: "bg-(--color-destructive)",
    label: "Vencido",
    daysLabel: (d) =>
      `${Math.abs(d)} dia${Math.abs(d) !== 1 ? "s" : ""} em atraso`,
  },
  urgent: {
    pill: "bg-(--hb-orange-muted) text-(--hb-orange-deep)",
    band: "bg-(--hb-orange)",
    label: "Urgente",
    daysLabel: (d) => `Vence em ${d} dia${d !== 1 ? "s" : ""}`,
  },
  soon: {
    pill: "bg-(--hb-cyan-muted) text-(--hb-cyan-deep)",
    band: "bg-(--hb-cyan)",
    label: "Esta semana",
    daysLabel: (d) => `Vence em ${d} dia${d !== 1 ? "s" : ""}`,
  },
  ok: {
    pill: "bg-(--hb-green-muted) text-(--hb-green-deep)",
    band: "bg-(--hb-green)",
    label: "Em dia",
    daysLabel: (d) => `Vence em ${d} dias`,
  },
};

const GOVERNANCE_STEPS = [
  { key: "pendente", label: "Criação", sub: "Sistema agrupou em lote" },
  { key: "aprovado", label: "Aprovação", sub: "Diretor Gestor (1ª camada)" },
  {
    key: "autorizado",
    label: "Autorização",
    sub: "Diretor Autorizador (2ª camada)",
  },
  { key: "pago", label: "Pagamento", sub: "Super_admin confirma no banco" },
] as const;

const STATUS_ORDER = [
  "pendente",
  "aprovado",
  "autorizado",
  "pago",
  "cancelado",
];

export function PayableCard({ payable, onAction }: PayableCardProps) {
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

  const firstAttachment = payable.attachments[0];
  const dueStatus = getDueStatus(payable.dueAt);
  const cfg = DUE_CONFIG[dueStatus];
  const diffDays = Math.ceil(
    (payable.dueAt.getTime() - Date.now()) / 86_400_000,
  );
  const currentStep = STATUS_ORDER.indexOf(payable.status);

  return (
    <div className="relative overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface) transition-shadow hover:shadow-sm">
      {/* Left color band */}
      <div
        className={clsx("absolute left-0 top-0 h-full w-1", cfg.band)}
        aria-hidden="true"
      />

      <div className="pl-5 pr-4 pt-4 pb-4">
        {/* Header row */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-0.5">
            {payable.projectId && (
              <span
                title="Vinculado a projeto aprovado"
                className="flex items-center justify-center w-5 h-5 rounded bg-(--hb-cyan-muted) shrink-0"
              >
                <Link2 className="h-3 w-3 text-(--hb-cyan-deep)" />
              </span>
            )}
            <p className="text-sm font-semibold text-(--fg) leading-tight line-clamp-2">
              {payable.description}
            </p>
          </div>
          <p className="text-xs text-(--fg-muted)">{payable.supplierName}</p>
        </div>

        {/* Amount + due date */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className="text-2xl font-bold tabular-nums text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmtBRL(payable.amount)}
          </span>
          <div className="flex flex-col items-end gap-1">
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full",
                cfg.pill,
              )}
            >
              <Calendar className="h-3 w-3" />
              {fmtDate(payable.dueAt)}
            </span>
            <span
              className={clsx(
                "text-[10px] font-semibold",
                cfg.pill.split(" ")[1],
              )}
            >
              {cfg.daysLabel(diffDays)}
            </span>
          </div>
        </div>

        {/* Governance flow */}
        {payable.status !== "cancelado" && (
          <div className="flex border border-(--border) rounded-lg overflow-hidden mb-3">
            {GOVERNANCE_STEPS.map((step, i) => {
              const isDone = currentStep > i;
              const isCurrent =
                currentStep === i ||
                (payable.status === "pago" &&
                  i === GOVERNANCE_STEPS.length - 1);

              return (
                <div
                  key={step.key}
                  className={clsx(
                    "flex-1 px-2 py-2.5 border-r border-(--border) last:border-r-0",
                    isDone && "bg-(--hb-green-muted)",
                    isCurrent && !isDone && "bg-(--hb-orange-muted)",
                  )}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={clsx(
                        "flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0",
                        isDone
                          ? "bg-(--hb-green) text-(--hb-blue)"
                          : isCurrent
                            ? "bg-(--hb-orange) text-(--fg-invert)"
                            : "bg-(--surface-alt) text-(--fg-muted)",
                      )}
                    >
                      {isDone ? <Check className="h-2.5 w-2.5" /> : i + 1}
                    </span>
                  </div>
                  <p
                    className={clsx(
                      "text-[10px] font-bold uppercase leading-tight",
                      isDone || isCurrent ? "text-(--fg)" : "text-(--fg-muted)",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-(--fg-muted) mt-0.5 leading-tight">
                    {step.sub}
                  </p>
                  {isDone && i === 1 && payable.approvedByName && (
                    <p className="text-[10px] text-(--hb-cyan-deep) font-semibold mt-1 truncate">
                      {payable.approvedByName}
                    </p>
                  )}
                  {isDone && i === 2 && payable.authorizedByName && (
                    <p className="text-[10px] text-(--hb-green-deep) font-semibold mt-1 truncate">
                      {payable.authorizedByName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cancelled state */}
        {payable.status === "cancelado" && (
          <div className="rounded-lg border border-(--color-destructive-muted) bg-(--color-destructive-muted) px-3 py-2.5 mb-3">
            <p className="text-xs font-bold text-(--color-destructive) uppercase tracking-widest">
              Cancelado
            </p>
            {payable.cancellationReason && (
              <p className="text-xs text-(--fg-muted) mt-1">
                {payable.cancellationReason}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {payable.notes && (
          <p className="text-xs text-(--fg-muted) italic border-t border-(--divider) pt-2">
            {payable.notes}
          </p>
        )}

        {/* Comprovante */}
        {firstAttachment && (
          <div className="mt-3 pt-3 border-t border-(--divider)">
            <button
              onClick={() =>
                openAttachment({ attachmentId: firstAttachment.id })
              }
              disabled={isOpeningAttachment}
              className="flex items-center gap-1.5 text-xs font-semibold text-(--hb-blue) hover:underline disabled:opacity-60"
            >
              <Paperclip className="h-3 w-3" />
              {isOpeningAttachment ? "Abrindo…" : "Ver comprovante"}
            </button>
            {attachmentError && (
              <p className="text-xs text-(--color-destructive) mt-1">
                {attachmentError}
              </p>
            )}
          </div>
        )}

        {/* Action button */}
        {onAction &&
          payable.status !== "pago" &&
          payable.status !== "cancelado" && (
            <div className="mt-3 pt-3 border-t border-(--divider)">
              {payable.status === "pendente" && (
                <button
                  onClick={() => onAction("approve")}
                  className="w-full py-2 rounded-lg bg-(--hb-orange) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-orange-deep) transition-colors"
                >
                  Enviar para aprovação
                </button>
              )}
              {payable.status === "aprovado" && (
                <button
                  onClick={() => onAction("authorize")}
                  className="w-full py-2 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors"
                >
                  Marcar como incluído no banco
                </button>
              )}
              {payable.status === "autorizado" && (
                <button
                  onClick={() => onAction("pay")}
                  className="w-full py-2 rounded-lg bg-(--hb-green) text-(--hb-blue) text-xs font-bold hover:bg-(--hb-green-deep) transition-colors"
                >
                  Marcar como pago
                </button>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
