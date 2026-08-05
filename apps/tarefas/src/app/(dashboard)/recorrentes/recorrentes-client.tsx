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
import {
  CalendarClock,
  CalendarOff,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  createRecurrenceRule,
  endRecurrenceRule,
  updateRecurrenceRule,
} from "../../../actions/recurrence";
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

const MONTH_LABEL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

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
  const [editingRule, setEditingRule] = useState<RecurrenceRuleView | null>(
    null,
  );

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

  const { execute: submitUpdateRule, isPending: isUpdating } = useAction(
    updateRecurrenceRule,
    {
      onSuccess() {
        setEditingRule(null);
        router.refresh();
      },
    },
  );

  const { execute: submitEndRule } = useAction(endRecurrenceRule, {
    onSuccess() {
      router.refresh();
    },
  });

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
          quote={{
            text: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.",
            reference: "Eclesiastes 3:1",
          }}
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova regra
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => {
            // Encerrada = end_date já vencido (a ação "Encerrar" grava
            // end_date = agora; o campo "Encerrar em" do formulário também
            // aceita uma data futura, que ainda não encerra a regra — só
            // marca quando vai encerrar).
            const endedAt =
              rule.endDate && rule.endDate.getTime() <= Date.now()
                ? rule.endDate
                : null;

            return (
              <li
                key={rule.id}
                className="flex flex-col gap-3 rounded-md border border-(--border) bg-(--surface) px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
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
                      {rule.type === "anual" &&
                        rule.month !== null &&
                        ` (${MONTH_LABEL[rule.month - 1]})`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {endedAt ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-(--surface-alt) px-3 py-1.5 text-xs font-semibold text-(--fg-muted)">
                      <CalendarOff className="h-3.5 w-3.5" aria-hidden="true" />
                      Encerrada em {fmtDate(endedAt)}
                    </span>
                  ) : (
                    <>
                      {rule.nextRunAt && (
                        <span className="flex items-center gap-1.5 rounded-full bg-(--hb-cyan-muted) px-3 py-1.5 text-xs font-semibold text-(--hb-cyan-deep)">
                          <CalendarClock
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Próxima: {fmtDate(rule.nextRunAt)}
                        </span>
                      )}
                      {rule.endDate && (
                        <span className="text-xs text-(--fg-muted)">
                          Até {fmtDate(rule.endDate)}
                        </span>
                      )}
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingRule(rule)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </Button>
                  {!endedAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        submitEndRule({ recurrenceRuleId: rule.id })
                      }
                    >
                      <CalendarOff className="h-3.5 w-3.5" aria-hidden="true" />
                      Encerrar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
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

      <Dialog
        open={editingRule !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar regra de recorrência</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <RecurrenceForm
              initialValues={editingRule}
              onSubmit={(rule) =>
                submitUpdateRule({
                  recurrenceRuleId: editingRule.id,
                  rule,
                })
              }
              onCancel={() => setEditingRule(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
