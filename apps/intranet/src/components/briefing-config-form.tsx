"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Button,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { Mail } from "lucide-react";

export type BriefingFrequency = "diario" | "semanal";

const briefingConfigSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["diario", "semanal"]),
});

export type BriefingConfigValues = z.infer<typeof briefingConfigSchema>;

const FREQUENCY_LABEL: Record<BriefingFrequency, string> = {
  diario: "Diário",
  semanal: "Semanal",
};

export interface BriefingConfigFormProps {
  initialValues?: Partial<BriefingConfigValues>;
  onSubmit: (values: BriefingConfigValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function BriefingConfigForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: BriefingConfigFormProps) {
  const [enabled, setEnabled] = useState(initialValues?.enabled ?? false);
  const [frequency, setFrequency] = useState<BriefingFrequency>(
    initialValues?.frequency ?? "diario",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = briefingConfigSchema.safeParse({ enabled, frequency });
    if (!result.success) return;
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 rounded-(--radius) border border-(--border) bg-(--surface-alt) px-3.5 py-3.5">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            Receber briefing por e-mail
          </span>
          <span className="text-xs">
            Um resumo de anúncios, decisões e agenda enviado no ritmo que você
            escolher.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Desativar briefing" : "Ativar briefing"}
          onClick={() => setEnabled((v) => !v)}
          className={`relative h-4.75 w-8.5 shrink-0 rounded-full transition-colors duration-(--transition-fast) ${
            enabled ? "bg-(--brand)" : "bg-(--border)"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-(--shadow-xs) transition-[left] duration-(--transition-fast) ${
              enabled ? "left-4" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <FormField label="Frequência" disabled={!enabled}>
        <Select
          value={frequency}
          onValueChange={(v) => setFrequency(v as BriefingFrequency)}
          disabled={!enabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FREQUENCY_LABEL) as BriefingFrequency[]).map((f) => (
              <SelectItem key={f} value={f}>
                {FREQUENCY_LABEL[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Salvar preferência
        </Button>
      </div>
    </form>
  );
}
