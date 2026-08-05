"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { CheckCircle2, ListMusic, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { Track } from "@hebron/types/radio";
import { PlaylistView } from "./playlist-view";
import { PlaylistForm, type PlaylistFormValues } from "./playlist-form";
import {
  activatePlaylist,
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../actions/playlists";
import type { PlaylistWithTracks } from "../lib/queries";

export interface PlaylistsAdminPanelProps {
  playlists: PlaylistWithTracks[];
  tracks: Track[];
}

export function PlaylistsAdminPanel({
  playlists,
  tracks,
}: PlaylistsAdminPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PlaylistWithTracks | null>(null);
  const [deleting, setDeleting] = React.useState<PlaylistWithTracks | null>(
    null,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [activatingId, setActivatingId] = React.useState<string | null>(null);

  const { execute: create, status: createStatus } = useAction(createPlaylist, {
    onSuccess: () => {
      setCreateOpen(false);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao criar playlist"),
  });
  const { execute: update, status: updateStatus } = useAction(updatePlaylist, {
    onSuccess: () => {
      setEditing(null);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao salvar playlist"),
  });
  const { execute: remove, status: deleteStatus } = useAction(deletePlaylist, {
    onSuccess: () => {
      setDeleting(null);
      setDeleteError(null);
      router.refresh();
    },
    onError: ({ error }) => {
      setDeleteError(error.serverError ?? "Erro ao remover playlist");
    },
  });
  const { execute: activate } = useAction(activatePlaylist, {
    onSuccess: () => {
      setActivatingId(null);
      router.refresh();
    },
    onError: () => setActivatingId(null),
  });

  function handleCreate(values: PlaylistFormValues) {
    setFormError(null);
    create(values);
  }

  function handleUpdate(values: PlaylistFormValues) {
    if (!editing) return;
    setFormError(null);
    update({ playlistId: editing.id, ...values });
  }

  function handleActivate(playlist: PlaylistWithTracks) {
    setActivatingId(playlist.id);
    activate({ playlistId: playlist.id });
  }

  return (
    <section aria-labelledby="playlists-admin-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="playlists-admin-heading"
          className="flex items-center gap-2 font-(family-name:--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
        >
          <ListMusic
            className="h-4.5 w-4.5 text-(--brand)"
            aria-hidden="true"
          />
          Playlists ({playlists.length})
        </h2>
        <Button
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          disabled={tracks.length === 0}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          Nova playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <EmptyState
          title="Nenhuma playlist cadastrada"
          description={
            tracks.length === 0
              ? "Envie faixas antes de montar uma playlist."
              : "Crie a primeira playlist para o Auto DJ ter o que tocar."
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="rounded-(--radius-md) border border-(--border) p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                {playlist.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-(--radius-pill) bg-(--brand-muted) px-2 py-0.5 text-xs font-(--font-weight-semibold) text-(--brand)">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Ativa no Auto DJ
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1">
                  {!playlist.isActive && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={activatingId === playlist.id}
                      onClick={() => handleActivate(playlist)}
                    >
                      Ativar
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${playlist.name}`}
                    onClick={() => {
                      setFormError(null);
                      setEditing(playlist);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${playlist.name}`}
                    disabled={playlist.isActive}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(playlist);
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <PlaylistView
                name={`${playlist.name}${playlist.loop ? " · repete" : ""}`}
                tracks={playlist.tracks}
              />
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova playlist</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          <PlaylistForm
            tracks={tracks}
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
            <DialogTitle>Editar playlist</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          {editing && (
            <PlaylistForm
              tracks={tracks}
              playlist={editing}
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
            <DialogTitle>Remover playlist</DialogTitle>
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
              onClick={() => deleting && remove({ playlistId: deleting.id })}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
