"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { reviewReport } from "../actions/reports";

interface ReportReviewActionsProps {
  reportId: string;
}

/** Diretor aprova ou rejeita um relatório submetido (F2-P1). */
export function ReportReviewActions({ reportId }: ReportReviewActionsProps) {
  const router = useRouter();
  const { execute, isPending, result } = useAction(reviewReport, {
    onSuccess() {
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => execute({ reportId, decision: "rejected" })}
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
          onClick={() => execute({ reportId, decision: "approved" })}
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
