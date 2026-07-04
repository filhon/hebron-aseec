"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock } from "lucide-react";
import { triggerPanicButton, closeVoting } from "../actions/voting";

interface VotingAdminActionsProps {
  projectId: string;
  quorumMet: boolean;
}

/** Ações exclusivas de super_admin sobre uma votação em andamento (F2-P6). */
export function VotingAdminActions({
  projectId,
  quorumMet,
}: VotingAdminActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const panic = useAction(triggerPanicButton, {
    onSuccess() {
      router.refresh();
    },
  });
  const close = useAction(closeVoting, {
    onSuccess() {
      router.refresh();
    },
  });

  const action = quorumMet ? close : panic;
  const label = quorumMet ? "Encerrar Votação" : "Acionar Botão de Pânico";
  const description = quorumMet
    ? "Quórum atingido — encerra a votação com o resultado atual, mesmo sem 100% de participação."
    : "Quórum ainda não atingido — força o encerramento pela maioria dos votos já registrados.";

  return (
    <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-2 flex items-center gap-1.5">
        {quorumMet ? (
          <Lock className="w-3.5 h-3.5" aria-hidden />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden />
        )}
        Ações de Administrador
      </p>
      <p className="text-xs text-(--fg-muted) mb-3 leading-relaxed">
        {description}
      </p>

      {action.result.serverError && (
        <p className="text-xs text-(--color-destructive) mb-2">
          {action.result.serverError}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-(--radius) border px-3 py-2 text-xs font-bold transition-colors"
          style={{
            borderColor: "var(--color-destructive)",
            color: "var(--color-destructive)",
          }}
        >
          {label}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-(--radius) border border-(--border) px-3 py-2 text-xs font-semibold text-(--fg-muted)"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={action.isPending}
            onClick={() => action.execute({ projectId })}
            className="flex-1 rounded-(--radius) px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--color-destructive)" }}
          >
            {action.isPending ? "Processando…" : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
