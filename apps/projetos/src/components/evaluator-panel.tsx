"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { assignEvaluator } from "../actions/evaluations";
import type { EvaluatorOption } from "../lib/queries";

interface EvaluatorPanelProps {
  projectId: string;
  evaluators: EvaluatorOption[];
}

export function EvaluatorPanel({ projectId, evaluators }: EvaluatorPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("");

  const { execute, isPending, result } = useAction(assignEvaluator, {
    onSuccess() {
      setSelected("");
      router.refresh();
    },
  });

  if (evaluators.length === 0) return null;

  return (
    <div className="rounded-md border border-dashed border-(--border) bg-(--surface-alt) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3 flex items-center gap-1.5">
        <UserPlus className="w-3.5 h-3.5" aria-hidden />
        Designar Avaliador
      </p>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
        >
          <option value="">Selecione um avaliador</option>
          {evaluators.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName ?? "Sem nome"}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selected || isPending}
          onClick={() => execute({ projectId, evaluatorId: selected })}
          className="shrink-0 rounded-(--radius) px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-blue)" }}
        >
          {isPending ? "Designando…" : "Designar"}
        </button>
      </div>
      {result.serverError && (
        <p className="text-xs text-(--color-destructive) mt-2">
          {result.serverError}
        </p>
      )}
    </div>
  );
}
