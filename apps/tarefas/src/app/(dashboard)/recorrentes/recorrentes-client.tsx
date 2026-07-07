"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type {
  RecurrenceType,
  TaskTemplate,
  Workspace,
} from "@hebron/types/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { CalendarClock, Plus, RefreshCw } from "lucide-react";
import { createRecurrenceRule } from "../../../actions/recurrence";
import type { RecurrenceRuleView } from "../../../lib/queries";
import { RecurrenceForm } from "../../../components/recurrence-form";

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export interface RecorrentesClientProps {
  rules: RecurrenceRuleView[];
  templates: TaskTemplate[];
}

export function RecorrentesClient({
  rules,
  templates,
}: RecorrentesClientProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const { execute: submitCreateRule, isPending } = useAction(
    createRecurrenceRule,
    {
      onSuccess() {
        setCreating(false);
        setTemplateId("");
        router.refresh();
      },
    },
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Tarefas recorrentes"
        description="Regras de repetição configuradas e a previsão da próxima execução."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova regra
          </Button>
        }
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma tarefa recorrente"
          description="Regras de recorrência aparecerão aqui assim que forem criadas."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova regra
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-col gap-3 rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-muted) text-(--hb-blue)">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-(--fg)">
                    {rule.templateName}
                  </p>
                  <p className="text-xs text-(--fg-muted)">
                    {WORKSPACE_LABEL[rule.workspace]} ·{" "}
                    {RECURRENCE_LABEL[rule.type]}
                    {rule.interval > 1 && ` a cada ${rule.interval}`}
                  </p>
                </div>
              </div>

              {rule.nextRunAt && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-(--hb-cyan-muted) px-3 py-1.5 text-xs font-semibold text-(--hb-cyan-deep)">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  Próxima: {fmtDate(rule.nextRunAt)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova regra de recorrência</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <FormField label="Template" required>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {templateId && (
              <RecurrenceForm
                onSubmit={(rule) =>
                  submitCreateRule({ taskTemplateId: templateId, rule })
                }
                onCancel={() => setCreating(false)}
                isLoading={isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
