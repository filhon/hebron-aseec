"use client";

import { Input, Label } from "@hebron/ui";

export interface PeriodInputValue {
  /** Data ISO (yyyy-mm-dd) ou string vazia enquanto não preenchida */
  start: string;
  end: string;
}

export type PeriodPickerValue = [
  PeriodInputValue,
  PeriodInputValue,
  PeriodInputValue,
];

export interface PeriodPickerProps {
  value: PeriodPickerValue;
  onChange: (value: PeriodPickerValue) => void;
  /** Data mínima selecionável (yyyy-mm-dd), tipicamente hoje */
  minDate?: string;
  className?: string;
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

// Máximo de 7 dias consecutivos por período de preferência (BRAIN §6.8 /
// packages/validators/src/flats/index.ts MAX_PERIOD_DAYS).
const MAX_PERIOD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ORDINAL_LABEL: [string, string, string] = [
  "1ª preferência",
  "2ª preferência",
  "3ª preferência",
];

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function validatePeriod(period: PeriodInputValue): string | null {
  const diff = daysBetween(period.start, period.end);
  if (diff === null) return null;
  if (diff <= 0) return "A data final deve ser depois da inicial";
  if (diff > MAX_PERIOD_DAYS) {
    return `Máximo de ${MAX_PERIOD_DAYS} dias por período`;
  }
  return null;
}

export function PeriodPicker({
  value,
  onChange,
  minDate,
  className,
}: PeriodPickerProps) {
  function updatePeriod(index: number, patch: Partial<PeriodInputValue>) {
    const next = value.map((period, i) =>
      i === index ? { ...period, ...patch } : period,
    ) as PeriodPickerValue;
    onChange(next);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {value.map((period, index) => {
        const error = validatePeriod(period);
        const diff = daysBetween(period.start, period.end);

        return (
          <div
            key={index}
            className="rounded-(--radius) border border-(--border) p-4"
          >
            <p className="mb-3 text-sm font-semibold text-(--fg)">
              {ORDINAL_LABEL[index]}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`period-${index}-start`}>Início</Label>
                <Input
                  id={`period-${index}-start`}
                  type="date"
                  min={minDate}
                  hasError={Boolean(error)}
                  value={period.start}
                  onChange={(event) =>
                    updatePeriod(index, { start: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`period-${index}-end`}>Fim</Label>
                <Input
                  id={`period-${index}-end`}
                  type="date"
                  min={period.start || minDate}
                  hasError={Boolean(error)}
                  value={period.end}
                  onChange={(event) =>
                    updatePeriod(index, { end: event.target.value })
                  }
                />
              </div>
            </div>

            {error ? (
              <p className="mt-2 text-xs text-(--color-destructive)">{error}</p>
            ) : diff !== null ? (
              <p className="mt-2 text-xs text-(--fg-muted)">
                {diff} dia{diff !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
