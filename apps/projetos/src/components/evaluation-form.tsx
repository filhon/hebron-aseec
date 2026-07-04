"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { submitEvaluation } from "../actions/evaluations";

interface EvaluationFormProps {
  projectId: string;
}

export function EvaluationForm({ projectId }: EvaluationFormProps) {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<
    "approved" | "rejected" | null
  >(null);
  const [notes, setNotes] = useState("");

  const { execute, isPending, result } = useAction(submitEvaluation, {
    onSuccess() {
      router.refresh();
    },
  });

  const notesTooShort = notes.trim().length > 0 && notes.trim().length < 20;

  return (
    <div className="rounded-md border border-dashed border-(--border) bg-(--surface-alt) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
        Registrar Avaliação
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(
            [
              { key: "approved", label: "✓ Favorável" },
              { key: "rejected", label: "✗ Desfavorável" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRecommendation(opt.key)}
              className="flex-1 rounded-(--radius) border-2 py-2 text-xs font-bold transition-all duration-(--dur-fast)"
              style={{
                borderColor:
                  opt.key === "approved"
                    ? "var(--hb-green)"
                    : "var(--color-destructive)",
                backgroundColor:
                  recommendation === opt.key
                    ? opt.key === "approved"
                      ? "var(--hb-green)"
                      : "var(--color-destructive)"
                    : opt.key === "approved"
                      ? "var(--hb-green-muted)"
                      : "var(--color-destructive-muted)",
                color:
                  recommendation === opt.key
                    ? "#fff"
                    : opt.key === "approved"
                      ? "var(--hb-green-fg)"
                      : "var(--color-destructive)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Deixe suas notas e comentários sobre este projeto (mín. 20 caracteres)…"
          className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none"
        />
        {notesTooShort && (
          <p className="text-xs text-(--color-destructive)">
            O parecer deve ter pelo menos 20 caracteres.
          </p>
        )}
        {result.serverError && (
          <p className="text-xs text-(--color-destructive)">
            {result.serverError}
          </p>
        )}
        <button
          type="button"
          disabled={!recommendation || notes.trim().length < 20 || isPending}
          onClick={() =>
            recommendation &&
            execute({ projectId, recommendation, notes: notes.trim() })
          }
          className="w-full flex items-center justify-center gap-2 rounded-(--radius) bg-(--brand) text-(--brand-fg) py-2 text-sm font-semibold hover:bg-(--hb-blue-soft) transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" aria-hidden />
          {isPending ? "Salvando…" : "Salvar Avaliação"}
        </button>
      </div>
    </div>
  );
}
