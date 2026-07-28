"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { reviewReport } from "../actions/reports";

interface ReportReviewActionsProps {
  reportId: string;
}

/**
 * Diretor aprova ou rejeita um relatório submetido (F2-P1). Parecer é
 * obrigatório na rejeição — o submissor precisa saber o que corrigir antes
 * de reenviar (P-2.6b).
 */
export function ReportReviewActions({ reportId }: ReportReviewActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);

  const { execute, isPending, result } = useAction(reviewReport, {
    onSuccess() {
      setNotes("");
      setNotesError(null);
      router.refresh();
    },
    onError({ error }) {
      const fieldError = (
        error.validationErrors as { notes?: { _errors?: string[] } } | undefined
      )?.notes?._errors?.[0];
      if (fieldError) setNotesError(fieldError);
    },
  });

  function handleReject() {
    if (notes.trim().length === 0) {
      setNotesError("Parecer obrigatório para rejeitar um relatório");
      return;
    }
    setNotesError(null);
    execute({ reportId, decision: "rejected", notes: notes.trim() });
  }

  function handleApprove() {
    setNotesError(null);
    execute({
      reportId,
      decision: "approved",
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <textarea
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Parecer da revisão (obrigatório ao rejeitar)…"
        maxLength={2000}
        disabled={isPending}
        className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-2.5 py-1.5 text-xs text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none disabled:opacity-50"
      />
      {notesError && (
        <p className="text-xs text-(--color-destructive)">{notesError}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={handleReject}
          className="inline-flex items-center gap-1 rounded-(--radius) border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
          style={{
            borderColor: "var(--color-destructive)",
            color: "var(--color-destructive)",
          }}
        >
          <X className="w-3 h-3" aria-hidden />
          Rejeitar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleApprove}
          className="inline-flex items-center gap-1 rounded-(--radius) px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-green)" }}
        >
          <Check className="w-3 h-3" aria-hidden />
          Aprovar
        </button>
      </div>
      {result.serverError && (
        <p className="text-xs text-(--color-destructive)">
          {result.serverError}
        </p>
      )}
    </div>
  );
}
