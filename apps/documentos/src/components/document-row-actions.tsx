"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, Send, Undo2, Trash2, Loader2 } from "lucide-react";
import { publishDocument, unpublishDocument } from "../actions/documents";
import { deleteDocument } from "../actions/documents";
import { deleteEdital } from "../actions/editals";

export function DocumentRowActions({
  id,
  isPublished,
  isEdital,
}: {
  id: string;
  isPublished: boolean;
  isEdital: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handlePublishToggle() {
    startTransition(async () => {
      if (isPublished) {
        await unpublishDocument({ id });
      } else {
        await publishDocument({ id });
      }
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      if (isEdital) {
        await deleteEdital({ id });
      } else {
        await deleteDocument({ id });
      }
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      <a
        href={`/editorial/${id}/editar`}
        className="hb-btn hb-btn-ghost hb-btn-xs"
        title="Editar"
      >
        <Edit size={13} aria-hidden="true" />
      </a>

      <button
        type="button"
        className="hb-btn hb-btn-ghost hb-btn-xs"
        title={isPublished ? "Despublicar" : "Publicar"}
        onClick={handlePublishToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 size={13} aria-hidden="true" className="animate-spin" />
        ) : isPublished ? (
          <Undo2 size={13} aria-hidden="true" />
        ) : (
          <Send size={13} aria-hidden="true" />
        )}
      </button>

      {confirmingDelete ? (
        <button
          type="button"
          className="hb-btn hb-btn-ghost hb-btn-xs"
          style={{ color: "var(--hb-red)" }}
          title="Confirmar remoção"
          onClick={handleDelete}
          disabled={isPending}
        >
          Confirmar?
        </button>
      ) : (
        <button
          type="button"
          className="hb-btn hb-btn-ghost hb-btn-xs"
          title="Remover"
          onClick={() => setConfirmingDelete(true)}
          onBlur={() => setConfirmingDelete(false)}
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
