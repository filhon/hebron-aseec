"use client";

import { useId, useState } from "react";
import {
  recurrenceRuleSchema,
  type RecurrenceRuleInput,
} from "@hebron/validators/tarefas";
import type { RecurrenceType } from "@hebron/types/tarefas";
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { RefreshCw } from "lucide-react";

const TYPE_LABEL: Record<RecurrenceType, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
};

const WEEKDAY_LABEL = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

interface PreviewInput {
  type: RecurrenceType;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  endDate: Date | null;
}

// Sem campo de horário no modelo de dados (RecurrenceRule não tem "hora do
// dia" — packages/types/src/tarefas). A pré-visualização descreve só o
// padrão de repetição, sem inventar um horário fixo.
function buildPreview(rule: PreviewInput): string {
  let base: string;
  switch (rule.type) {
    case "diaria":
      base = rule.interval > 1 ? `A cada ${rule.interval} dias` : "Todo dia";
      break;
    case "semanal": {
      const day =
        rule.dayOfWeek !== null ? WEEKDAY_LABEL[rule.dayOfWeek] : null;
      base = day
        ? rule.interval > 1
          ? `A cada ${rule.interval} semanas, na ${day}`
          : `Toda ${day}`
        : "Selecione o dia da semana";
      break;
    }
    case "mensal":
      base =
        rule.dayOfMonth !== null
          ? rule.interval > 1
            ? `A cada ${rule.interval} meses, no dia ${rule.dayOfMonth}`
            : `Todo dia ${rule.dayOfMonth} do mês`
          : "Selecione o dia do mês";
      break;
    case "anual":
      base =
        rule.dayOfMonth !== null
          ? rule.interval > 1
            ? `A cada ${rule.interval} anos, no dia ${rule.dayOfMonth}`
            : `Anualmente, no dia ${rule.dayOfMonth}`
          : "Selecione o dia";
      break;
  }
  if (rule.endDate) {
    base += ` até ${rule.endDate.toLocaleDateString("pt-BR")}`;
  }
  return base;
}

export interface RecurrenceFormProps {
  initialValues?: Partial<RecurrenceRuleInput>;
  onSubmit: (values: RecurrenceRuleInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function RecurrenceForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: RecurrenceFormProps) {
  const intervalId = useId();
  const dayOfMonthId = useId();
  const endDateId = useId();

  const [type, setType] = useState<RecurrenceType>(
    initialValues?.type ?? "semanal",
  );
  const [interval, setInterval] = useState(initialValues?.interval ?? 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(
    initialValues?.dayOfWeek ?? 1,
  );
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(
    initialValues?.dayOfMonth ?? 1,
  );
  const [endDate, setEndDate] = useState(
    initialValues?.endDate
      ? initialValues.endDate.toISOString().slice(0, 10)
      : "",
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof RecurrenceRuleInput, string>>
  >({});

  const preview = buildPreview({
    type,
    interval,
    dayOfWeek: type === "semanal" ? dayOfWeek : null,
    dayOfMonth: type === "mensal" || type === "anual" ? dayOfMonth : null,
    endDate: endDate ? new Date(`${endDate}T00:00:00`) : null,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      type,
      interval,
      dayOfWeek: type === "semanal" ? dayOfWeek : null,
      dayOfMonth: type === "mensal" || type === "anual" ? dayOfMonth : null,
      endDate: endDate ? new Date(`${endDate}T00:00:00`) : null,
    };
    const result = recurrenceRuleSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Partial<Record<keyof RecurrenceRuleInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RecurrenceRuleInput;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Frequência" required>
          <Select
            value={type}
            onValueChange={(v) => setType(v as RecurrenceType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABEL) as RecurrenceType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id={intervalId}
          label="Intervalo"
          required
          error={errors.interval}
        >
          <Input
            id={intervalId}
            type="number"
            min={1}
            value={interval}
            onChange={(e) =>
              setInterval(Math.max(1, Number(e.target.value) || 1))
            }
            hasError={!!errors.interval}
          />
        </FormField>
      </div>

      {type === "semanal" && (
        <FormField label="Dia da semana" required error={errors.dayOfWeek}>
          <Select
            value={dayOfWeek !== null ? String(dayOfWeek) : undefined}
            onValueChange={(v) => setDayOfWeek(Number(v))}
          >
            <SelectTrigger hasError={!!errors.dayOfWeek}>
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABEL.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      {(type === "mensal" || type === "anual") && (
        <FormField
          id={dayOfMonthId}
          label="Dia do mês"
          required
          error={errors.dayOfMonth}
        >
          <Input
            id={dayOfMonthId}
            type="number"
            min={1}
            max={31}
            value={dayOfMonth ?? ""}
            onChange={(e) =>
              setDayOfMonth(e.target.value ? Number(e.target.value) : null)
            }
            hasError={!!errors.dayOfMonth}
          />
        </FormField>
      )}

      <FormField id={endDateId} label="Encerrar em (opcional)">
        <Input
          id={endDateId}
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </FormField>

      <div className="flex items-start gap-2.5 rounded-(--radius) bg-(--brand-muted) px-3.5 py-3 text-sm text-(--hb-blue)">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Pré-visualização:</span> {preview}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Salvar recorrência
        </Button>
      </div>
    </form>
  );
}
