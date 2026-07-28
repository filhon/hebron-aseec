"use client";

import { FieldLabel, FieldError, SelectInput, MONTHS } from "./field-controls";
import type { WizardFormData } from "../project-wizard";

// Só existe para o wizard anual — o pontual não tem parcelas/ano de
// referência (BRAIN §6.2: "sem parcelas, pagamento único"), então o
// container nunca monta esta etapa para data.projectType === "pontual".

export function StepSchedule({
  data,
  onChange,
  error,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  error?: string;
}) {
  const parcelasTarget = parseInt(data.numeroParcelas) || 0;
  const selected = data.mesesSelecionados;
  const atLimit = parcelasTarget > 0 && selected.length >= parcelasTarget;

  function toggleMonth(m: number) {
    if (selected.includes(m)) {
      onChange({ mesesSelecionados: selected.filter((x) => x !== m) });
      return;
    }
    if (atLimit) return;
    onChange({ mesesSelecionados: [...selected, m].sort((a, b) => a - b) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required htmlFor="anoReferencia">
          Ano de Referência
        </FieldLabel>
        <SelectInput
          id="anoReferencia"
          value={data.anoReferencia}
          onChange={(v) => onChange({ anoReferencia: v })}
          options={[
            { value: "2025", label: "2025" },
            { value: "2026", label: "2026" },
            { value: "2027", label: "2027" },
          ]}
        />
      </div>

      <div>
        <FieldLabel required>Meses de Pagamento</FieldLabel>
        <p className="text-xs text-(--fg-muted) mb-3">
          Selecione os meses em que os recursos deverão ser liberados. O número
          deve coincidir com o de parcelas ({parcelasTarget || "—"}).
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTHS.map((month, idx) => {
            const num = idx + 1;
            const isSelected = selected.includes(num);
            const disabled = !isSelected && atLimit;
            return (
              <button
                key={num}
                type="button"
                onClick={() => toggleMonth(num)}
                disabled={disabled}
                aria-pressed={isSelected}
                className="rounded-(--radius) border-2 px-3 py-2 text-xs font-semibold transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: isSelected ? "var(--hb-blue)" : "var(--border)",
                  backgroundColor: isSelected
                    ? "var(--brand-muted)"
                    : "var(--surface)",
                  color: isSelected ? "var(--hb-blue)" : "var(--fg-muted)",
                }}
              >
                {month.substring(0, 3)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-(--fg-muted) mt-2">
          {selected.length} de {parcelasTarget || "—"} mês
          {parcelasTarget !== 1 ? "es" : ""} selecionado
          {selected.length !== 1 ? "s" : ""}.
        </p>
        <FieldError id="mesesSelecionados-error" error={error} />
      </div>
    </div>
  );
}
