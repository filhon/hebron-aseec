"use client";

import { useId, useState } from "react";
import {
  updateDashboardWidgetsSchema,
  type UpdateDashboardWidgetsInput,
} from "@hebron/validators/intranet";
import type {
  DashboardWidget,
  DashboardWidgetType,
  KPI,
} from "@hebron/types/intranet";
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
import {
  BarChart3,
  CalendarDays,
  GripVertical,
  Plus,
  Rss,
  TrendingUp,
  X,
} from "lucide-react";

const WIDGET_TYPE_OPTIONS: Array<{
  value: DashboardWidgetType;
  label: string;
  icon: typeof TrendingUp;
}> = [
  { value: "kpi", label: "Indicador (KPI)", icon: TrendingUp },
  { value: "chart", label: "Gráfico", icon: BarChart3 },
  { value: "feed", label: "Feed de atividades", icon: Rss },
  { value: "calendar", label: "Calendário", icon: CalendarDays },
];

const WIDGET_TYPE_LABEL: Record<DashboardWidgetType, string> = {
  kpi: "Indicador (KPI)",
  chart: "Gráfico",
  feed: "Feed de atividades",
  calendar: "Calendário",
};

interface WidgetDraft {
  key: string;
  id: string;
  type: DashboardWidgetType;
  config: Record<string, unknown>;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `widget-${Math.random().toString(36).slice(2)}`;
}

const DEFAULT_WIDGET_CONFIG: Record<
  DashboardWidgetType,
  Record<string, unknown>
> = {
  kpi: {},
  chart: {},
  feed: { feedLimit: 5 },
  calendar: { daysAhead: 14 },
};

function emptyWidget(type: DashboardWidgetType): WidgetDraft {
  return {
    key: generateId(),
    id: generateId(),
    type,
    config: DEFAULT_WIDGET_CONFIG[type],
  };
}

export interface WidgetConfigFormProps {
  initialWidgets?: DashboardWidget[];
  availableKpis: KPI[];
  onSubmit: (values: UpdateDashboardWidgetsInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function WidgetConfigForm({
  initialWidgets = [],
  availableKpis,
  onSubmit,
  onCancel,
  isLoading = false,
}: WidgetConfigFormProps) {
  const addTypeId = useId();

  const [widgets, setWidgets] = useState<WidgetDraft[]>(() =>
    [...initialWidgets]
      .sort((a, b) => a.position - b.position)
      .map((w) => ({ key: w.id, id: w.id, type: w.type, config: w.config })),
  );
  const [newType, setNewType] = useState<DashboardWidgetType>("kpi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateWidgetConfig(index: number, patch: Record<string, unknown>) {
    setWidgets((prev) =>
      prev.map((w, i) =>
        i === index ? { ...w, config: { ...w.config, ...patch } } : w,
      ),
    );
  }

  function addWidget() {
    setWidgets((prev) => [...prev, emptyWidget(newType)]);
  }

  function removeWidget(index: number) {
    setWidgets((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      if (moved) next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      widgets: widgets.map((w, index) => ({
        id: w.id,
        type: w.type,
        position: index,
        config: w.config,
      })),
    };
    const result = updateDashboardWidgetsSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex items-end gap-3">
        <FormField id={addTypeId} label="Tipo de widget" className="flex-1">
          <Select
            value={newType}
            onValueChange={(v) => setNewType(v as DashboardWidgetType)}
          >
            <SelectTrigger id={addTypeId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIDGET_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <Button type="button" variant="outline" onClick={addWidget}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Adicionar widget
        </Button>
      </div>

      {errors.widgets && (
        <p role="alert" className="text-xs">
          {errors.widgets}
        </p>
      )}

      {widgets.length === 0 ? (
        <p className="rounded-(--radius) border border-dashed border-(--border) px-4 py-6 text-center text-sm">
          Nenhum widget configurado. Adicione um acima para montar seu painel.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {widgets.map((widget, index) => (
            <li
              key={widget.key}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-start gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-3.5 transition-opacity duration-(--transition-fast) ${
                dragIndex === index ? "opacity-50" : ""
              }`}
            >
              <span
                className="mt-2 flex shrink-0 cursor-grab items-center text-(--fg-muted) active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {WIDGET_TYPE_LABEL[widget.type]}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWidget(index)}
                    aria-label={`Remover widget ${WIDGET_TYPE_LABEL[widget.type]}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius) text-(--fg-muted) transition-colors hover:bg-(--surface-alt) hover:text-(--color-destructive)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {(widget.type === "kpi" || widget.type === "chart") && (
                  <Select
                    value={(widget.config.kpiId as string | undefined) ?? ""}
                    onValueChange={(v) =>
                      updateWidgetConfig(index, { kpiId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableKpis.map((kpi) => (
                        <SelectItem key={kpi.id} value={kpi.id}>
                          {kpi.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {widget.type === "feed" && (
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={(widget.config.feedLimit as number | undefined) ?? 5}
                    onChange={(e) =>
                      updateWidgetConfig(index, {
                        feedLimit: Number(e.target.value),
                      })
                    }
                    className="max-w-40"
                  />
                )}

                {widget.type === "calendar" && (
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={
                      (widget.config.daysAhead as number | undefined) ?? 14
                    }
                    onChange={(e) =>
                      updateWidgetConfig(index, {
                        daysAhead: Number(e.target.value),
                      })
                    }
                    className="max-w-40"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Salvar painel
        </Button>
      </div>
    </form>
  );
}
