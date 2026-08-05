"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Pencil, Plus, Trash2, Users2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
} from "@hebron/ui";
import type { Author, Series } from "@hebron/types/radio";
import { SeriesForm, type SeriesFormValues } from "./series-form";
import { createSeries, deleteSeries, updateSeries } from "../actions/tracks";

export interface SeriesAdminPanelProps {
  authors: Author[];
  series: Series[];
}

export function SeriesAdminPanel({ authors, series }: SeriesAdminPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Series | null>(null);
  const [deleting, setDeleting] = React.useState<Series | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const { execute: create, status: createStatus } = useAction(createSeries, {
    onSuccess: () => {
      setCreateOpen(false);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao criar série"),
  });
  const { execute: update, status: updateStatus } = useAction(updateSeries, {
    onSuccess: () => {
      setEditing(null);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao salvar série"),
  });
  const { execute: remove, status: deleteStatus } = useAction(deleteSeries, {
    onSuccess: () => {
      setDeleting(null);
      setDeleteError(null);
      router.refresh();
    },
    onError: ({ error }) =>
      setDeleteError(error.serverError ?? "Erro ao remover série"),
  });

  function handleCreate(values: SeriesFormValues) {
    setFormError(null);
    create(values);
  }

  function handleUpdate(values: SeriesFormValues) {
    if (!editing) return;
    setFormError(null);
    update({ seriesId: editing.id, ...values });
  }

  return (
    <section aria-labelledby="series-admin-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="series-admin-heading"
          className="flex items-center gap-2 font-(family-name:--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
        >
          <Users2 className="h-4.5 w-4.5 text-(--brand)" aria-hidden="true" />
          Séries ({series.length})
        </h2>
        <Button
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          disabled={authors.length === 0}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          Nova série
        </Button>
      </div>

      {series.length === 0 ? (
        <EmptyState
          title="Nenhuma série cadastrada"
          description={
            authors.length === 0
              ? "Cadastre um autor antes de criar uma série."
              : "Crie a primeira série para agrupar faixas por tema."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
          {series.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-(--font-weight-semibold) text-(--fg)">
                  {item.name}
                </p>
                <p className="truncate text-xs text-(--fg-muted)">
                  {item.authorName}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${item.name}`}
                onClick={() => {
                  setFormError(null);
                  setEditing(item);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${item.name}`}
                onClick={() => {
                  setDeleteError(null);
                  setDeleting(item);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova série</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          <SeriesForm
            authors={authors}
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
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          {editing && (
            <SeriesForm
              authors={authors}
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
              As faixas desta série não são removidas — apenas desvinculadas.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {deleteError}
            </p>
          )}
          <p className="text-sm text-(--fg)">
            Remover &ldquo;{deleting?.name}&rdquo;?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteStatus === "executing"}
              onClick={() => deleting && remove({ seriesId: deleting.id })}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
