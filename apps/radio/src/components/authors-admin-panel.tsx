"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Pencil, Plus, Trash2, User2 } from "lucide-react";
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
import type { Author } from "@hebron/types/radio";
import { AuthorForm, type AuthorFormValues } from "./author-form";
import {
  createAuthor,
  deleteAuthor,
  getAuthorPhotoUploadUrl,
  updateAuthor,
} from "../actions/tracks";

export interface AuthorsAdminPanelProps {
  authors: Author[];
}

async function uploadAuthorPhoto(file: File): Promise<string> {
  const result = await getAuthorPhotoUploadUrl({
    fileName: file.name,
    contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
  });
  if (!result?.data) {
    throw new Error(result?.serverError ?? "Falha ao preparar upload da foto");
  }
  await fetch(result.data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  return result.data.publicUrl;
}

export function AuthorsAdminPanel({ authors }: AuthorsAdminPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Author | null>(null);
  const [deleting, setDeleting] = React.useState<Author | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const { execute: create, status: createStatus } = useAction(createAuthor, {
    onSuccess: () => {
      setCreateOpen(false);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao criar autor"),
  });
  const { execute: update, status: updateStatus } = useAction(updateAuthor, {
    onSuccess: () => {
      setEditing(null);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao salvar autor"),
  });
  const { execute: remove, status: deleteStatus } = useAction(deleteAuthor, {
    onSuccess: () => {
      setDeleting(null);
      setDeleteError(null);
      router.refresh();
    },
    onError: ({ error }) =>
      setDeleteError(error.serverError ?? "Erro ao remover autor"),
  });

  async function resolvePhotoUrl(values: AuthorFormValues) {
    if (!values.photoFile) return values.existingPhotoUrl;
    setIsUploadingPhoto(true);
    try {
      return await uploadAuthorPhoto(values.photoFile);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleCreate(values: AuthorFormValues) {
    setFormError(null);
    try {
      const photoUrl = await resolvePhotoUrl(values);
      create({ name: values.name, bio: values.bio, photoUrl });
    } catch {
      setFormError("Falha ao enviar a foto. Tente novamente.");
    }
  }

  async function handleUpdate(values: AuthorFormValues) {
    if (!editing) return;
    setFormError(null);
    try {
      const photoUrl = await resolvePhotoUrl(values);
      update({
        authorId: editing.id,
        name: values.name,
        bio: values.bio,
        photoUrl,
      });
    } catch {
      setFormError("Falha ao enviar a foto. Tente novamente.");
    }
  }

  const isSaving =
    createStatus === "executing" ||
    updateStatus === "executing" ||
    isUploadingPhoto;

  return (
    <section aria-labelledby="autores-admin-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="autores-admin-heading"
          className="flex items-center gap-2 font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
        >
          <User2 className="h-4.5 w-4.5 text-(--brand)" aria-hidden="true" />
          Autores ({authors.length})
        </h2>
        <Button
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          Novo autor
        </Button>
      </div>

      {authors.length === 0 ? (
        <EmptyState
          title="Nenhum autor cadastrado"
          description="Cadastre o primeiro autor para organizar o catálogo da rádio."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
          {authors.map((author) => (
            <li key={author.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-(--font-weight-semibold) text-(--fg)">
                  {author.name}
                </p>
                {author.bio && (
                  <p className="truncate text-xs text-(--fg-muted)">
                    {author.bio}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${author.name}`}
                onClick={() => {
                  setFormError(null);
                  setEditing(author);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${author.name}`}
                onClick={() => {
                  setDeleteError(null);
                  setDeleting(author);
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
            <DialogTitle>Novo autor</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          <AuthorForm onSubmit={handleCreate} isLoading={isSaving} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar autor</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          {editing && (
            <AuthorForm
              author={editing}
              onSubmit={handleUpdate}
              isLoading={isSaving}
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
            <DialogTitle>Remover autor</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {deleteError}
            </p>
          )}
          <p className="text-sm text-(--fg)">
            Remover &ldquo;{deleting?.name}&rdquo;? Autores com séries ou faixas
            vinculadas não podem ser removidos.
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
              onClick={() => deleting && remove({ authorId: deleting.id })}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
