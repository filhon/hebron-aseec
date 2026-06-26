"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  CheckSquare,
  ArrowRight,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import type { BatchApproval, Payable } from "@hebron/types/financeiro";

interface BatchApprovalCardProps {
  batch: BatchApproval;
  /** Currently authenticated user role for action gating */
  userRole?: "super_admin" | "diretor";
  onSubmitForApproval?: (batchId: string, notes: string) => void;
  onMarkIncluded?: (batchId: string) => void;
  onMarkPaid?: (batchId: string) => void;
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

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function clsx(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function getDueStatus(dueAt: Date): "overdue" | "soon" | "ok" {
  const diff = Math.ceil((dueAt.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return "overdue";
  if (diff <= 5) return "soon";
  return "ok";
}

const DUE_PILL: Record<string, string> = {
  overdue: "bg-(--color-destructive-muted) text-(--color-destructive)",
  soon: "bg-(--hb-orange-muted) text-(--hb-orange-deep)",
  ok: "bg-(--surface-alt) text-(--fg-muted)",
};

function PayableRow({ p }: { p: Payable }) {
  const dueStatus = getDueStatus(p.dueAt);
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-(--radius) border border-(--border) bg-(--bg)">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-(--fg) truncate">
          {p.description}
        </p>
        <p className="text-xs text-(--fg-muted) truncate mt-0.5">
          {p.supplierName}
          {p.costCenterId ? ` · ${p.costCenterId}` : ""}
        </p>
      </div>
      <span
        className={clsx(
          "inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
          DUE_PILL[dueStatus],
        )}
      >
        <Calendar className="h-2.5 w-2.5" />
        {fmtDateShort(p.dueAt)}
      </span>
      <span className="text-sm font-bold tabular-nums text-(--fg) shrink-0">
        {fmtBRL(p.amount)}
      </span>
    </div>
  );
}

export function BatchApprovalCard({
  batch,
  userRole: _userRole = "super_admin",
  onSubmitForApproval,
  onMarkIncluded,
  onMarkPaid,
}: BatchApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);

  const weekLabel = `${fmtDateShort(batch.weekStart)} a ${fmtDate(batch.weekEnd)}`;
  const batchCode = `L-${batch.weekStart.getFullYear()}-${String(batch.weekStart.getMonth() + 1).padStart(2, "0")}${String(Math.ceil(batch.weekStart.getDate() / 7)).padStart(2, "0")}`;

  // Determine the current governance state
  // Note: BatchApprovalStatus has no "pago" state — authorization is the final batch-level step.
  // Individual payable statuses track actual payment.
  const stage: "pendente" | "aprovado" | "autorizado" | "cancelado" =
    batch.status === "cancelado"
      ? "cancelado"
      : batch.authorizedAt
        ? "autorizado"
        : batch.approvedAt
          ? "aprovado"
          : "pendente";

  const STAGE_CONFIG = {
    pendente: {
      icon: <Clock className="h-5 w-5" />,
      iconBg: "bg-(--hb-orange)",
      iconColor: "text-(--fg-invert)",
      cardBorder: "border-(--hb-orange)",
      title: `Lote ${batchCode} · Semana de ${weekLabel}`,
      hint: `Sistema agrupou ${batch.payables.length} pagamentos. Envie para aprovação do diretor gestor.`,
    },
    aprovado: {
      icon: <Check className="h-5 w-5" />,
      iconBg: "bg-(--hb-cyan-muted)",
      iconColor: "text-(--hb-cyan-deep)",
      cardBorder: "border-l-4 border-l-(--hb-cyan)",
      title: "Aprovados pelo diretor gestor",
      hint: `Inclua no banco e aguarde a autorização. ${batch.approvedByName ? `Aprovado por ${batch.approvedByName}.` : ""}`,
    },
    autorizado: {
      icon: <CheckSquare className="h-5 w-5" />,
      iconBg: "bg-(--hb-green-muted)",
      iconColor: "text-(--hb-green-deep)",
      cardBorder: "border-l-4 border-l-(--hb-green)",
      title: "Autorizados no banco",
      hint: `Pagamentos liberados. Marque como pagos após confirmação no extrato. ${batch.authorizedByName ? `Autorizado por ${batch.authorizedByName}.` : ""}`,
    },
    cancelado: {
      icon: <X className="h-5 w-5" />,
      iconBg: "bg-(--color-destructive-muted)",
      iconColor: "text-(--color-destructive)",
      cardBorder: "border-(--color-destructive-muted)",
      title: "Lote cancelado",
      hint: "",
    },
  } satisfies Record<
    typeof stage,
    {
      icon: React.ReactNode;
      iconBg: string;
      iconColor: string;
      cardBorder: string;
      title: string;
      hint: string;
    }
  >;

  const cfg = STAGE_CONFIG[stage];

  return (
    <div
      className={clsx(
        "rounded-(--radius) border bg-(--surface) overflow-hidden",
        cfg.cardBorder,
      )}
    >
      {/* Stage info strip */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-(--border)">
        <span
          className={clsx(
            "flex items-center justify-center w-11 h-11 rounded-(--radius) shrink-0",
            cfg.iconBg,
            cfg.iconColor,
          )}
        >
          {cfg.icon}
        </span>

        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {cfg.title}
          </p>
          {cfg.hint && (
            <p className="text-sm text-(--fg-muted) mt-0.5 line-clamp-2">
              {cfg.hint}
            </p>
          )}
          {stage === "aprovado" && (
            <p className="text-xs text-(--hb-orange-deep) font-bold mt-1">
              ⚠️ Aprovador ≠ autorizador (governança dual obrigatória)
            </p>
          )}
        </div>

        {/* Governance action */}
        <div className="flex items-center gap-2 shrink-0">
          {stage === "pendente" && onSubmitForApproval && (
            <>
              {!showNotesInput ? (
                <button
                  onClick={() => setShowNotesInput(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--hb-orange) text-(--fg-invert) text-sm font-semibold hover:bg-(--hb-orange-deep) transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                  Enviar para aprovação
                </button>
              ) : (
                <button
                  onClick={() => setShowNotesInput(false)}
                  className="px-3 py-2 rounded-lg border border-(--border) text-sm font-semibold text-(--fg-muted) hover:text-(--fg) transition-colors"
                >
                  Cancelar
                </button>
              )}
            </>
          )}
          {stage === "aprovado" && onMarkIncluded && (
            <button
              onClick={() => onMarkIncluded(batch.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-sm font-semibold hover:bg-(--hb-blue-soft) transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              Marcar como incluído no banco
            </button>
          )}
          {stage === "autorizado" && onMarkPaid && (
            <button
              onClick={() => onMarkPaid(batch.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--hb-green) text-(--hb-blue) text-sm font-bold hover:bg-(--hb-green-deep) transition-colors"
            >
              <Check className="h-4 w-4" />
              Marcar todos como pagos
            </button>
          )}
        </div>
      </div>

      {/* Notes input for submit */}
      {showNotesInput && (
        <div className="px-5 py-4 border-b border-(--border) bg-(--bg-alt)">
          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-2">
            Observações para o aprovador (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Ex: Pagamentos urgentes. Pr. Samuel precisa do apoio até sexta."
            className="w-full rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) resize-none outline-none focus:border-(--hb-blue) transition-colors"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowNotesInput(false)}
              className="px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:text-(--fg) transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onSubmitForApproval?.(batch.id, notes);
                setShowNotesInput(false);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-(--hb-orange) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-orange-deep) transition-colors"
            >
              <ArrowRight className="h-3 w-3" />
              Enviar lote
            </button>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-(--border)">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-(--fg-muted)">
            {batch.payables.length}{" "}
            {batch.payables.length === 1 ? "pagamento" : "pagamentos"}
          </span>
          <span className="text-(--divider)">·</span>
          <span
            className="font-bold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmtBRL(batch.totalAmount)}
          </span>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-(--hb-blue) hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Recolher
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Ver pagamentos
            </>
          )}
        </button>
      </div>

      {/* Payable list */}
      {expanded && (
        <div className="px-4 py-3 flex flex-col gap-2">
          {batch.payables.map((p) => (
            <PayableRow key={p.id} p={p} />
          ))}

          {/* Total */}
          <div className="flex items-center justify-between px-3 py-3 rounded-(--radius) border border-(--border) bg-(--bg-alt) mt-1">
            <span className="text-sm font-bold text-(--fg-muted) uppercase tracking-[0.08em]">
              Total do lote
            </span>
            <span
              className="text-lg font-bold tabular-nums text-(--fg)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {fmtBRL(batch.totalAmount)}
            </span>
          </div>

          {/* Governance dual warning */}
          {stage === "pendente" && (
            <div className="flex items-start gap-2 px-3 py-3 rounded-(--radius) border border-(--hb-orange-muted) bg-(--hb-orange-muted)">
              <AlertTriangle className="h-4 w-4 text-(--hb-orange-deep) mt-0.5 shrink-0" />
              <div className="text-xs text-(--fg)">
                <strong>Governança dual obrigatória.</strong> O aprovador e o
                autorizador devem ser pessoas diferentes. O sistema bloqueia o
                mesmo usuário nas duas etapas.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline footer */}
      <div className="grid grid-cols-4 divide-x divide-(--border) border-t border-(--border)">
        {[
          {
            step: "Criação",
            done: true,
            date: batch.createdAt,
            by: "Sistema",
          },
          {
            step: "Aprovação",
            done: !!batch.approvedAt,
            date: batch.approvedAt,
            by: batch.approvedByName,
          },
          {
            step: "Autorização",
            done: !!batch.authorizedAt,
            date: batch.authorizedAt,
            by: batch.authorizedByName,
          },
          {
            step: "Pagamento",
            done:
              batch.payables.length > 0 &&
              batch.payables.every((p) => p.status === "pago"),
            date: null,
            by: null,
          },
        ].map((item, i) => {
          const activeStepIdx =
            stage === "pendente"
              ? 0
              : stage === "aprovado"
                ? 1
                : stage === "autorizado"
                  ? 2
                  : -1;
          return (
            <div
              key={i}
              className={clsx(
                "px-3 py-3 flex flex-col gap-0.5",
                item.done ? "bg-(--hb-green-muted)" : "",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    "flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0",
                    item.done
                      ? "bg-(--hb-green) text-(--hb-blue)"
                      : i === activeStepIdx
                        ? "bg-(--hb-orange) text-(--fg-invert)"
                        : "bg-(--surface-alt) text-(--fg-muted)",
                  )}
                >
                  {item.done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-(--fg-muted)">
                  {item.step}
                </span>
              </div>
              {item.date && (
                <p className="text-[10px] text-(--fg-muted) pl-5.5">
                  {fmtDate(item.date)}
                </p>
              )}
              {item.by && (
                <p className="text-[10px] font-semibold text-(--fg) pl-5.5 truncate">
                  {item.by}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
