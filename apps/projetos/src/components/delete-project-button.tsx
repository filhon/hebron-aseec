"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProject } from "../actions/projects";

interface DeleteProjectButtonProps {
  projectId: string;
  redirectTo: string;
}

export function DeleteProjectButton({
  projectId,
  redirectTo,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { execute, isPending, result } = useAction(deleteProject, {
    onSuccess() {
      router.push(redirectTo);
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--fg-muted) hover:text-(--color-destructive) transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
        Excluir projeto
      </button>
    );
  }

  return (
    <div className="rounded-md border border-(--color-destructive) bg-(--color-destructive-muted) px-4 py-4">
      <p className="text-sm font-semibold text-(--color-destructive) mb-2">
        Excluir este projeto?
      </p>
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Justificativa obrigatória (mín. 20 caracteres)…"
        className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none"
      />
      {result.serverError && (
        <p className="text-xs text-(--color-destructive) mt-2">
          {result.serverError}
        </p>
      )}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-(--radius) border border-(--border) px-3 py-1.5 text-xs font-semibold text-(--fg-muted)"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={reason.trim().length < 20 || isPending}
          onClick={() => execute({ projectId, reason: reason.trim() })}
          className="flex-1 rounded-(--radius) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--color-destructive)" }}
        >
          {isPending ? "Excluindo…" : "Confirmar Exclusão"}
        </button>
      </div>
    </div>
  );
}
