"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { TaskTemplate, Workspace } from "@hebron/types/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  PageHeader,
} from "@hebron/ui";
import { Layers, Pencil, Plus, Power, Zap } from "lucide-react";
import {
  createTaskTemplate,
  instantiateTaskTemplate,
  toggleTaskTemplate,
  updateTaskTemplate,
} from "../../../actions/templates";
import { TemplateForm } from "../../../components/template-form";

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

export interface TemplatesClientProps {
  templates: TaskTemplate[];
}

export function TemplatesClient({ templates }: TemplatesClientProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(
    null,
  );

  const { execute: submitCreateTemplate, isPending: isCreating } = useAction(
    createTaskTemplate,
    {
      onSuccess() {
        setCreating(false);
        router.refresh();
      },
    },
  );

  const { execute: submitUpdateTemplate, isPending: isUpdating } = useAction(
    updateTaskTemplate,
    {
      onSuccess() {
        setEditingTemplate(null);
        router.refresh();
      },
    },
  );

  const { execute: submitToggleTemplate } = useAction(toggleTaskTemplate, {
    onSuccess() {
      router.refresh();
    },
  });

  const { execute: submitInstantiate, isPending: isInstantiating } = useAction(
    instantiateTaskTemplate,
    {
      onSuccess({ input }) {
        const template = templates.find((t) => t.id === input.templateId);
        router.refresh();
        if (template) router.push(`/workspace/${template.workspace}`);
      },
    },
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Templates de tarefas"
        description="Checklists reutilizáveis — disparados manualmente ou por eventos de outros módulos."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Criar template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum template cadastrado"
          description="Crie um checklist reutilizável para disparar manualmente ou por evento de outro módulo."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar template
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((template) => (
            <li
              key={template.id}
              className="rounded-md border border-(--border) bg-(--surface) px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-muted) text-(--hb-blue)">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-(--fg)">
                      {template.name}
                    </p>
                    {template.description && (
                      <p className="mt-0.5 text-xs text-(--fg-muted)">
                        {template.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-(--surface-alt) px-2 py-0.5 text-[10px] font-medium text-(--fg-muted)">
                        {WORKSPACE_LABEL[template.workspace]}
                      </span>
                      <span className="rounded-full bg-(--surface-alt) px-2 py-0.5 text-[10px] font-medium text-(--fg-muted)">
                        {template.tasks.length} tarefa
                        {template.tasks.length === 1 ? "" : "s"}
                      </span>
                      {template.trigger && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-(--hb-cyan-muted) px-2 py-0.5 text-[10px] font-medium text-(--hb-cyan-deep)">
                          <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                          {template.trigger.sourceModule} ·{" "}
                          {template.trigger.event}
                        </span>
                      )}
                      {!template.isActive && (
                        <span className="rounded-full bg-(--color-destructive-muted) px-2 py-0.5 text-[10px] font-medium text-(--color-destructive)">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      submitToggleTemplate({
                        templateId: template.id,
                        isActive: !template.isActive,
                      })
                    }
                  >
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                    {template.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!template.isActive}
                    loading={isInstantiating}
                    onClick={() =>
                      submitInstantiate({ templateId: template.id })
                    }
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    Instanciar
                  </Button>
                </div>
              </div>

              {/* Preview das tarefas pré-definidas */}
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-(--divider) pt-3">
                {template.tasks.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-(--fg-muted)"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-(--fg-subtle)" />
                    <span className="min-w-0 flex-1 truncate text-(--fg)">
                      {item.title}
                    </span>
                    {item.dueOffsetDays !== null && (
                      <span className="shrink-0">+{item.dueOffsetDays}d</span>
                    )}
                    {item.subtasks.length > 0 && (
                      <span className="shrink-0">
                        {item.subtasks.length} subtarefa
                        {item.subtasks.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo template</DialogTitle>
          </DialogHeader>
          <TemplateForm
            onSubmit={(values) => submitCreateTemplate(values)}
            onCancel={() => setCreating(false)}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              initialValues={{
                name: editingTemplate.name,
                description: editingTemplate.description,
                workspace: editingTemplate.workspace,
                tasks: editingTemplate.tasks.map((item) => ({
                  title: item.title,
                  description: item.description,
                  priority: item.priority,
                  dueOffsetDays: item.dueOffsetDays,
                  subtasks: item.subtasks,
                })),
                trigger: editingTemplate.trigger,
              }}
              onSubmit={(values) =>
                submitUpdateTemplate({
                  templateId: editingTemplate.id,
                  ...values,
                })
              }
              onCancel={() => setEditingTemplate(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
