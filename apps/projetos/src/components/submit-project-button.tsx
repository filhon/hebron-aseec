"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { submitProject } from "../actions/projects";

interface SubmitProjectButtonProps {
  projectId: string;
}

/** Transiciona rascunho → validação (F2-P1: era o botão que faltava). */
export function SubmitProjectButton({ projectId }: SubmitProjectButtonProps) {
  const router = useRouter();

  const { execute, isPending, result } = useAction(submitProject, {
    onSuccess() {
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => execute({ projectId })}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity disabled:opacity-60"
        style={{ backgroundColor: "var(--hb-orange)" }}
      >
        <Send className="w-4 h-4" aria-hidden />
        {isPending ? "Submetendo…" : "Submeter à Diretoria"}
      </button>
      {result.serverError && (
        <p className="text-xs text-(--color-destructive) max-w-xs text-right">
          {result.serverError}
        </p>
      )}
    </div>
  );
}
