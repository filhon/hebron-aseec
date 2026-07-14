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
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import type { Instructor } from "@hebron/types/plataforma";
import { InstructorForm, type InstructorFormValues } from "./instructor-form";
import {
  createInstructor,
  updateInstructor,
  deleteInstructor,
} from "../actions/instructors";
import type { InstructorWithStats, SelectableUser } from "../lib/queries";

export interface InstructorTableProps {
  instructors: InstructorWithStats[];
  users: SelectableUser[];
}

export function InstructorTable({ instructors, users }: InstructorTableProps) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Instructor | null>(null);
  const [deleting, setDeleting] = React.useState<InstructorWithStats | null>(
    null,
  );
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const usersById = React.useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  const { execute: create, status: createStatus } = useAction(
    createInstructor,
    {
      onSuccess: () => {
        setCreateOpen(false);
        router.refresh();
      },
    },
  );
  const { execute: update, status: updateStatus } = useAction(
    updateInstructor,
    {
      onSuccess: () => {
        setEditing(null);
        router.refresh();
      },
    },
  );
  const { execute: remove, status: deleteStatus } = useAction(
    deleteInstructor,
    {
      onSuccess: () => {
        setDeleting(null);
        setDeleteError(null);
        router.refresh();
      },
      onError: ({ error }) => {
        setDeleteError(error.serverError ?? "Erro ao remover instrutor");
      },
    },
  );

  function handleCreate(values: InstructorFormValues) {
    create({ userId: values.userId, name: values.name, bio: values.bio });
  }

  function handleUpdate(values: InstructorFormValues) {
    if (!editing) return;
    update({
      instructorId: editing.id,
      userId: values.userId,
      name: values.name,
      bio: values.bio,
    });
  }

  function openDelete(instructor: InstructorWithStats) {
    setDeleteError(null);
    setDeleting(instructor);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setCreateOpen(true)}
        >
          Novo instrutor
        </Button>
      </div>

      {instructors.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum instrutor cadastrado"
          description="Cadastre o primeiro instrutor para liberar a criação de cursos."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              Cadastrar instrutor
            </Button>
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
                  Usuário vinculado
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
              {instructors.map((instructor, i) => {
                const user = instructor.userId
                  ? usersById.get(instructor.userId)
                  : undefined;

                return (
                  <tr
                    key={instructor.id}
                    className={
                      i < instructors.length - 1
                        ? "border-b border-(--border)"
                        : ""
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-(--fg)">
                        {instructor.name}
                      </p>
                      {instructor.bio && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-(--fg-muted)">
                          {instructor.bio}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-(--fg-muted)">
                      {user ? (user.fullName ?? user.email) : "—"}
                    </td>
                    <td className="px-4 py-3 text-(--fg-muted)">
                      {instructor.courseCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${instructor.name}`}
                          onClick={() => setEditing(instructor)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover ${instructor.name}`}
                          disabled={instructor.courseCount > 0}
                          title={
                            instructor.courseCount > 0
                              ? "Remova ou reatribua os cursos deste instrutor antes de excluí-lo"
                              : undefined
                          }
                          onClick={() => openDelete(instructor)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo instrutor</DialogTitle>
            <DialogDescription>
              Vincule um usuário já cadastrado para liberá-lo como instrutor.
            </DialogDescription>
          </DialogHeader>
          <InstructorForm
            users={users}
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
            <DialogTitle>Editar instrutor</DialogTitle>
          </DialogHeader>
          {editing && (
            <InstructorForm
              mode="edit"
              instructor={editing}
              users={users}
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
            <DialogTitle>Remover instrutor</DialogTitle>
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
              onClick={() => deleting && remove({ instructorId: deleting.id })}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
