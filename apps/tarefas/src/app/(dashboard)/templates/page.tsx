"use client";

import { useState } from "react";
import type { TaskTemplate, Workspace } from "@hebron/types/tarefas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  FormField,
  Input,
  PageHeader,
} from "@hebron/ui";
import { Layers, Pencil, Zap } from "lucide-react";
import { mockTaskTemplates } from "../../../lib/mock-data";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const WORKSPACE_LABEL: Record<Workspace, string> = {
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  contabil_fiscal: "Contábil e Fiscal",
  eclesiastico: "Eclesiástico",
  comunicacao: "Comunicação",
  tecnologia_inovacao: "Tecnologia e Inovação",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(mockTaskTemplates);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  function toggleActive(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
    );
  }

  function openEdit(template: TaskTemplate) {
    setEditing(template);
    setDraftName(template.name);
    setDraftDescription(template.description ?? "");
  }

  function saveEdit() {
    if (!editing) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              name: draftName.trim() || t.name,
              description: draftDescription.trim() || null,
              updatedAt: new Date(),
            }
          : t,
      ),
    );
    setEditing(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Templates de tarefas"
        description="Checklists reutilizáveis — disparados manualmente ou por eventos de outros módulos."
      />

      <ul className="flex flex-col gap-3">
        {templates.map((template) => (
          <li
            key={template.id}
            className="rounded-(--radius-md) border border-(--border) bg-(--surface) px-4 py-4"
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
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleActive(template.id)}
                  aria-pressed={template.isActive}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    template.isActive
                      ? "bg-(--hb-green)"
                      : "bg-(--surface-alt)",
                  )}
                  aria-label={
                    template.isActive ? "Desativar template" : "Ativar template"
                  }
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-(--surface) shadow-(--shadow-xs) transition-transform",
                      template.isActive
                        ? "translate-x-[22px]"
                        : "translate-x-0.5",
                    )}
                  />
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(template)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar
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

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <FormField id="template-name" label="Nome" required>
              <Input
                id="template-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </FormField>
            <FormField id="template-description" label="Descrição">
              <Input
                id="template-description"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
