"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Gavel } from "lucide-react";
import { registerProjectDecision } from "../actions/projects";
import { BRL } from "../lib/stage-utils";

interface DecisionPanelProps {
  projectId: string;
  requestedAmount: number;
  isPontual: boolean;
}

const MONTH_LABELS = [
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

/**
 * Painel de decisão da diretoria (P-2.15 CORRETIVO) — único ponto de UI que
 * registra o valor EFETIVAMENTE aprovado, distinto do valor pedido
 * (requestedAmount). Mostrado quando o estágio atual admite "aprovado" no
 * mapa de transições (validacao ou homologacao — VALID_STAGE_TRANSITIONS).
 */
export function DecisionPanel({
  projectId,
  requestedAmount,
  isPontual,
}: DecisionPanelProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<"aprovado" | "reprovado" | null>(
    null,
  );
  const [amount, setAmount] = useState(requestedAmount.toString());
  const [split, setSplit] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [notes, setNotes] = useState("");

  const { execute, isPending, result } = useAction(registerProjectDecision, {
    onSuccess() {
      router.refresh();
    },
  });

  const amountValue = parseFloat(amount.replace(",", "."));
  const amountValid =
    decision !== "aprovado" || (amountValue > 0 && !Number.isNaN(amountValue));
  const monthsValid = !split || selectedMonths.length === numParcelas;
  const canSubmit = decision !== null && amountValid && monthsValid;

  function toggleMonth(m: number) {
    setSelectedMonths((prev) =>
      prev.includes(m)
        ? prev.filter((x) => x !== m)
        : [...prev, m].sort((a, b) => a - b),
    );
  }

  function submit() {
    if (!decision) return;
    execute({
      projectId,
      decision,
      approvedAmount: decision === "aprovado" ? amountValue : undefined,
      approvedParcelas:
        decision === "aprovado" && split ? numParcelas : undefined,
      approvedMesesPagamento:
        decision === "aprovado" && split ? selectedMonths : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3 flex items-center gap-1.5">
        <Gavel className="w-3.5 h-3.5" aria-hidden />
        Decisão da Diretoria
      </p>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setDecision("aprovado")}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-(--radius) border-2 py-2 text-xs font-bold transition-all duration-(--dur-fast)"
          style={{
            borderColor: "var(--hb-green)",
            backgroundColor:
              decision === "aprovado"
                ? "var(--hb-green)"
                : "var(--hb-green-muted)",
            color:
              decision === "aprovado"
                ? "var(--fg-invert)"
                : "var(--hb-green-fg)",
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
          Aprovar
        </button>
        <button
          type="button"
          onClick={() => setDecision("reprovado")}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-(--radius) border-2 py-2 text-xs font-bold transition-all duration-(--dur-fast)"
          style={{
            borderColor: "var(--color-destructive)",
            backgroundColor:
              decision === "reprovado"
                ? "var(--color-destructive)"
                : "var(--color-destructive-muted)",
            color:
              decision === "reprovado"
                ? "var(--fg-invert)"
                : "var(--color-destructive)",
          }}
        >
          <XCircle className="w-3.5 h-3.5" aria-hidden />
          Reprovar
        </button>
      </div>

      {decision === "aprovado" && (
        <div className="flex flex-col gap-3 mb-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-(--fg-muted)">
              Valor aprovado (R$)
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--fg) tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
            />
            {!Number.isNaN(amountValue) && amountValue !== requestedAmount && (
              <span className="text-xs text-(--fg-muted)">
                Solicitado: {BRL.format(requestedAmount)}
              </span>
            )}
          </label>

          {isPontual && (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-(--fg-muted)">
                <input
                  type="checkbox"
                  checked={split}
                  onChange={(e) => {
                    setSplit(e.target.checked);
                    setSelectedMonths([]);
                  }}
                />
                Dividir em parcelas (em vez de pagamento único)
              </label>

              {split && (
                <div className="mt-2 flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs text-(--fg-muted)">
                    Número de parcelas
                    <select
                      value={numParcelas}
                      onChange={(e) => {
                        setNumParcelas(Number(e.target.value));
                        setSelectedMonths([]);
                      }}
                      className="rounded-(--radius) border border-(--border) bg-(--surface) px-2 py-1 text-sm text-(--fg)"
                    >
                      {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                        <option key={n} value={n}>
                          {n}x
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {MONTH_LABELS.map((label, i) => {
                      const month = i + 1;
                      const active = selectedMonths.includes(month);
                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => toggleMonth(month)}
                          className="rounded-(--radius) border py-1.5 text-xs font-semibold transition-colors"
                          style={{
                            borderColor: active
                              ? "var(--brand)"
                              : "var(--border)",
                            backgroundColor: active
                              ? "var(--brand)"
                              : "transparent",
                            color: active
                              ? "var(--brand-fg)"
                              : "var(--fg-muted)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-(--fg-muted)">
                    {selectedMonths.length}/{numParcelas} meses selecionados
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {decision !== null && (
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações (opcional)…"
          className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none mb-3"
        />
      )}

      {result.serverError && (
        <p className="text-xs text-(--color-destructive) mb-2">
          {result.serverError}
        </p>
      )}

      {decision !== null && (
        <button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={submit}
          className="w-full rounded-(--radius) px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{
            backgroundColor:
              decision === "aprovado"
                ? "var(--hb-green)"
                : "var(--color-destructive)",
          }}
        >
          {isPending
            ? "Registrando…"
            : decision === "aprovado"
              ? "Confirmar Aprovação"
              : "Confirmar Reprovação"}
        </button>
      )}
    </div>
  );
}
