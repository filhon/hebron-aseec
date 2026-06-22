"use client";

import { ChevronDown } from "lucide-react";
import type { StepProps } from "../project-wizard";

// ─── Local primitives ─────────────────────────────────────────────────────────

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-sm font-semibold mb-1.5"
      style={{ color: "var(--fg)" }}
    >
      {children}
      {required && (
        <span
          className="ml-0.5"
          style={{ color: "var(--color-destructive)" }}
          aria-hidden
        >
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="text-xs mt-1.5"
      style={{ color: "var(--color-destructive)" }}
      role="alert"
    >
      {message}
    </p>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-1.5" style={{ color: "var(--fg-muted)" }}>
      {children}
    </p>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
];

// ─── StepBudget ───────────────────────────────────────────────────────────────

export function StepBudget({ data, errors, onChange }: StepProps) {
  const total = data.valorTotal === "" ? 0 : (data.valorTotal as number);
  const parcelas = data.numeroParcelas;
  const porParcela = total > 0 && parcelas > 0 ? total / parcelas : 0;
  const selectedCount = data.mesesPagamento.length;
  const remaining = parcelas - selectedCount;

  function toggleMonth(m: number) {
    const current = data.mesesPagamento;
    if (current.includes(m)) {
      onChange({ mesesPagamento: current.filter((x) => x !== m) });
    } else {
      onChange({
        mesesPagamento: [...current, m].sort((a, b) => a - b),
      });
    }
  }

  const inputCls =
    "w-full rounded-(--radius) border px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:border-transparent";
  const inputStyle = {
    borderColor: "var(--border)",
    backgroundColor: "var(--bg-alt)",
    color: "var(--fg)",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Ano de referência */}
      <div>
        <Label required>Ano de Referência</Label>
        <div className="relative">
          <select
            value={data.anoReferencia}
            onChange={(e) =>
              onChange({ anoReferencia: Number(e.target.value) })
            }
            className={`${inputCls} appearance-none pr-10`}
            style={inputStyle}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden
          />
        </div>
      </div>

      {/* Valor total */}
      <div>
        <Label required>Valor Total Solicitado (R$)</Label>
        <input
          type="number"
          min={0}
          step={100}
          value={data.valorTotal === "" ? "" : (data.valorTotal as number)}
          onChange={(e) =>
            onChange({
              valorTotal: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          placeholder="Ex.: 48000"
          className={inputCls}
          style={inputStyle}
        />
        <FieldHint>Valor máximo por projeto: R$ 80.000.</FieldHint>
        <FieldError message={errors.valorTotal} />
      </div>

      {/* Número de parcelas */}
      <div>
        <Label required>Número de Parcelas</Label>
        <div className="relative">
          <select
            value={data.numeroParcelas}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({
                numeroParcelas: n,
                mesesPagamento: data.mesesPagamento.slice(0, n),
              });
            }}
            className={`${inputCls} appearance-none pr-10`}
            style={inputStyle}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} parcela{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden
          />
        </div>
        {porParcela > 0 && (
          <FieldHint>
            Valor por parcela:{" "}
            <span className="font-semibold" style={{ color: "var(--hb-blue)" }}>
              {BRL.format(porParcela)}
            </span>
          </FieldHint>
        )}
        <FieldError message={errors.numeroParcelas} />
      </div>

      {/* Meses de pagamento */}
      <div>
        <Label required>Meses de Pagamento</Label>
        <p className="text-xs mb-3" style={{ color: "var(--fg-muted)" }}>
          Selecione os {parcelas} mês{parcelas > 1 ? "es" : ""} em que os
          recursos deverão ser liberados.
          {remaining > 0 && selectedCount > 0 && (
            <span style={{ color: "var(--hb-orange)" }}>
              {" "}
              Faltam {remaining}.
            </span>
          )}
          {remaining === 0 && selectedCount === parcelas && (
            <span style={{ color: "var(--hb-green)" }}> Seleção completa.</span>
          )}
        </p>
        <div
          className="grid grid-cols-3 sm:grid-cols-4 gap-2"
          role="group"
          aria-label="Meses de pagamento"
        >
          {MONTHS.map((month, idx) => {
            const num = idx + 1;
            const selected = data.mesesPagamento.includes(num);
            const isComplete = selectedCount === parcelas && !selected;
            return (
              <button
                key={num}
                type="button"
                onClick={() => !isComplete && toggleMonth(num)}
                disabled={isComplete}
                aria-pressed={selected}
                className="rounded-(--radius) border-2 px-3 py-2.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: selected ? "var(--hb-blue)" : "var(--border)",
                  backgroundColor: selected
                    ? "var(--hb-blue)"
                    : "var(--surface)",
                  color: selected ? "#fff" : "var(--fg-muted)",
                }}
              >
                {month.substring(0, 3)}
              </button>
            );
          })}
        </div>
        <FieldError message={errors.mesesPagamento} />
      </div>

      {/* Cofinanciamento (optional) */}
      <div>
        <Label>Cofinanciamento</Label>
        <textarea
          value={data.cofinancimento}
          onChange={(e) => onChange({ cofinancimento: e.target.value })}
          placeholder="Há outras fontes de financiamento? Descreva valores e origens…"
          rows={2}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          maxLength={2000}
        />
      </div>

      {/* Financial summary */}
      {total > 0 && (
        <div
          className="rounded-md border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-alt)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--fg-muted)" }}
          >
            Resumo Financeiro
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--fg-muted)" }}>
                Valor total solicitado
              </span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: "var(--fg)" }}
              >
                {BRL.format(total)}
              </span>
            </div>
            {porParcela > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--fg-muted)" }}>
                  Valor por parcela ({parcelas}×)
                </span>
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: "var(--hb-blue)" }}
                >
                  {BRL.format(porParcela)}
                </span>
              </div>
            )}
            {data.mesesPagamento.length > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--fg-muted)" }}>
                  Meses selecionados
                </span>
                <span className="font-semibold" style={{ color: "var(--fg)" }}>
                  {data.mesesPagamento
                    .map((m) => MONTHS[m - 1]?.substring(0, 3))
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
