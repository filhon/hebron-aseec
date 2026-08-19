"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
} from "@hebron/ui";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import type { Series } from "@hebron/types/plataforma";
import { SeriesForm, type SeriesFormValues } from "./series-form";
import { createSeries, updateSeries, deleteSeries } from "../actions/series";
import type { SeriesWithStats } from "../lib/queries";

export interface SeriesTableProps {
  series: SeriesWithStats[];
}

export function SeriesTable({ series }: SeriesTableProps) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Series | null>(null);
  const [deleting, setDeleting] = React.useState<SeriesWithStats | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const { execute: create, status: createStatus } = useAction(createSeries, {
    onSuccess: () => {
      setCreateOpen(false);
      router.refresh();
    },
  });
  const { execute: update, status: updateStatus } = useAction(updateSeries, {
    onSuccess: () => {
      setEditing(null);
      router.refresh();
    },
  });
  const { execute: remove, status: deleteStatus } = useAction(deleteSeries, {
    onSuccess: () => {
      setDeleting(null);
      setDeleteError(null);
      router.refresh();
    },
    onError: ({ error }) => {
      setDeleteError(error.serverError ?? "Erro ao remover série");
    },
  });

  function handleCreate(values: SeriesFormValues) {
    create(values);
  }

  function handleUpdate(values: SeriesFormValues) {
    if (!editing) return;
    update({ seriesId: editing.id, ...values });
  }

  function openDelete(item: SeriesWithStats) {
    setDeleteError(null);
    setDeleting(item);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setCreateOpen(true)}
        >
          Nova série
        </Button>
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhuma série cadastrada"
          description="Cadastre a primeira série para liberar o filtro de coleções no catálogo."
          action={
            <Button onClick={() => setCreateOpen(true)}>Cadastrar série</Button>
          }
          hideQuote
        />
      ) : (
        <div className="overflow-x-auto rounded-(--radius) border border-(--border)">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-(--border) bg-(--surface-alt)">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--fg-muted)">
                  Nome
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--fg-muted)">
                  Slug
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--fg-muted)">
                  Cursos
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-(--fg-muted)">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((item, i) => (
                <tr
                  key={item.id}
                  className={
                    i < series.length - 1 ? "border-b border-(--border)" : ""
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-(--fg)">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-(--fg-muted)">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-(--fg-muted)">{item.slug}</td>
                  <td className="px-4 py-3 text-(--fg-muted)">
                    {item.courseCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remover ${item.name}`}
                        disabled={item.courseCount > 0}
                        title={
                          item.courseCount > 0
                            ? "Remova ou reatribua os cursos desta série antes de excluí-la"
                            : undefined
                        }
                        onClick={() => openDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova série</DialogTitle>
            <DialogDescription>
              Séries agrupam cursos por tema no filtro do catálogo.
            </DialogDescription>
          </DialogHeader>
          <SeriesForm
            onSubmit={handleCreate}
            isLoading={createStatus === "executing"}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar série</DialogTitle>
          </DialogHeader>
          {editing && (
            <SeriesForm
              mode="edit"
              series={editing}
              onSubmit={handleUpdate}
              isLoading={updateStatus === "executing"}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover série</DialogTitle>
            <DialogDescription>
              {deleting &&
                `Tem certeza que deseja remover "${deleting.name}"? Esta ação não pode ser desfeita.`}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-(--color-destructive)">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteStatus === "executing"}
              loading={deleteStatus === "executing"}
              onClick={() => deleting && remove({ seriesId: deleting.id })}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
