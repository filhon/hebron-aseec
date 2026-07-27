"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createContestation } from "../actions/projects";

interface ContestationFormProps {
  projectId: string;
}

export function ContestationForm({ projectId }: ContestationFormProps) {
  const router = useRouter();
  const [justification, setJustification] = useState("");
  const [open, setOpen] = useState(false);

  const { execute, isPending, result } = useAction(createContestation, {
    onSuccess() {
      setJustification("");
      setOpen(false);
      router.refresh();
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-(--hb-orange) px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-(--hb-orange-muted)"
        style={{ color: "var(--hb-orange-deep)" }}
      >
        Contestar Homologação
      </button>
    );
  }

  return (
    <div className="rounded-md border border-(--hb-orange) bg-(--hb-orange-muted) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--hb-orange-deep) mb-2 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        Contestar Homologação
      </p>
      <textarea
        rows={3}
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder="Descreva o motivo da contestação (mín. 30 caracteres)…"
        className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none"
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
          disabled={justification.trim().length < 30 || isPending}
          onClick={() => execute({ projectId, reason: justification.trim() })}
          className="flex-1 rounded-(--radius) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-orange-deep)" }}
        >
          {isPending ? "Enviando…" : "Enviar Contestação"}
        </button>
      </div>
    </div>
  );
}
