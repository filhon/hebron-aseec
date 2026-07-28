"use client";

import {
  FieldLabel,
  TextInput,
  Textarea,
  SelectInput,
  BRL,
} from "./field-controls";
import type { WizardFormData } from "../project-wizard";

export function StepBudget({
  data,
  onChange,
  errors,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  errors: Partial<Record<keyof WizardFormData, string>>;
}) {
  const parcelas = parseInt(data.numeroParcelas) || 1;
  const total = parseFloat(data.valorTotal) || 0;
  const porParcela = total > 0 && parcelas > 0 ? total / parcelas : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required htmlFor="valorTotal">
          Valor Total Solicitado (R$)
        </FieldLabel>
        <TextInput
          id="valorTotal"
          value={data.valorTotal}
          onChange={(v) => onChange({ valorTotal: v })}
          placeholder="Ex.: 48000"
          type="number"
          error={errors.valorTotal}
        />
        <p className="text-xs text-(--fg-muted) mt-1.5">
          Valor máximo anual: R$ 80.000 por projeto.
        </p>
      </div>

      {data.projectType === "anual" && (
        <div>
          <FieldLabel required htmlFor="numeroParcelas">
            Número de Parcelas
          </FieldLabel>
          <SelectInput
            id="numeroParcelas"
            value={data.numeroParcelas}
            onChange={(v) => onChange({ numeroParcelas: v })}
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1} parcela${i > 0 ? "s" : ""}`,
            }))}
            error={errors.numeroParcelas}
          />
          {porParcela > 0 && (
            <p className="text-xs text-(--fg-muted) mt-1.5">
              Valor por parcela:{" "}
              <span className="font-semibold text-(--hb-blue)">
                {BRL.format(porParcela)}
              </span>
            </p>
          )}
        </div>
      )}

      <div>
        <FieldLabel htmlFor="cofinancimento">
          Cofinanciamento (opcional)
        </FieldLabel>
        <Textarea
          id="cofinancimento"
          value={data.cofinancimento}
          onChange={(v) => onChange({ cofinancimento: v })}
          placeholder="Descreva se há outras fontes de financiamento para este projeto..."
          rows={2}
          error={errors.cofinancimento}
        />
      </div>

      {total > 0 && (
        <div className="rounded-md border border-(--border) bg-(--surface-alt) p-4">
          <p className="text-xs font-semibold text-(--fg-muted) uppercase tracking-wider mb-3">
            Resumo Financeiro
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-(--fg-muted)">Valor total</span>
              <span className="font-semibold text-(--fg) tabular-nums">
                {BRL.format(total)}
              </span>
            </div>
            {porParcela > 0 && data.projectType === "anual" && (
              <div className="flex justify-between text-sm">
                <span className="text-(--fg-muted)">
                  Valor por parcela ({parcelas}x)
                </span>
                <span className="font-semibold text-(--fg) tabular-nums">
                  {BRL.format(porParcela)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
