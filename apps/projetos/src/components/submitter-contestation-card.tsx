"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { createSubmitterContestation } from "../actions/projects";

interface SubmitterContestationItem {
  id: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  response: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

interface SubmitterContestationCardProps {
  projectId: string;
  contestableVersionId: string | null;
  deadline: Date | null;
  contestations: SubmitterContestationItem[];
}

function formatDeadline(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Contestação do submissor durante a validação (P-2.17 CORRETIVO, PATCH-029,
 * Q11/Q32/Q33). Formulário estruturado, uma vez por alteração: aparece
 * apenas quando `contestableVersionId` indica que a diretoria fez uma
 * alteração ainda sem contestação. Fora disso, mostra o histórico (mais
 * recente primeiro) — "aguardando resposta" ou a resposta da diretoria.
 */
export function SubmitterContestationCard({
  projectId,
  contestableVersionId,
  deadline,
  contestations,
}: SubmitterContestationCardProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const { execute, isPending, result } = useAction(
    createSubmitterContestation,
    {
      onSuccess() {
        setReason("");
        setOpen(false);
        router.refresh();
      },
    },
  );

  const deadlinePassed = deadline !== null && new Date() > deadline;
  const latest = contestations[0] ?? null;

  if (!contestableVersionId && !latest) return null;

  if (contestableVersionId && deadlinePassed) {
    return (
      <div className="rounded-md border border-(--border) bg-(--surface-alt) px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden />
          Prazo de contestação encerrado
        </p>
        <p className="text-xs text-(--fg-muted)">
          O prazo para contestar as alterações mais recentes já passou.
        </p>
      </div>
    );
  }

  if (contestableVersionId) {
    return (
      <div className="rounded-md border border-(--hb-orange) bg-(--hb-orange-muted) px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-(--hb-orange-deep) mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden />A diretoria
          alterou seu projeto
        </p>
        {deadline && (
          <p className="text-xs text-(--fg-muted) mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden />
            Você pode contestar até {formatDeadline(deadline)}
          </p>
        )}
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full rounded-md border border-(--hb-orange) px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-(--surface)"
            style={{ color: "var(--hb-orange-deep)" }}
          >
            Contestar alteração
          </button>
        ) : (
          <>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
                disabled={reason.trim().length < 30 || isPending}
                onClick={() => execute({ projectId, reason: reason.trim() })}
                className="flex-1 rounded-(--radius) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--hb-orange-deep)" }}
              >
                {isPending ? "Enviando…" : "Enviar Contestação"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!latest) return null;

  const isPendingStatus = latest.status === "pending";
  const isAccepted = latest.status === "accepted";

  return (
    <div className="rounded-md border border-(--border) bg-(--surface) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-2 flex items-center gap-1.5">
        {isPendingStatus ? (
          <Clock className="w-3.5 h-3.5" aria-hidden />
        ) : isAccepted ? (
          <CheckCircle2
            className="w-3.5 h-3.5"
            style={{ color: "var(--hb-green)" }}
            aria-hidden
          />
        ) : (
          <XCircle
            className="w-3.5 h-3.5"
            style={{ color: "var(--color-destructive)" }}
            aria-hidden
          />
        )}
        Contestação {isPendingStatus ? "aguardando resposta" : "respondida"}
      </p>
      <p className="text-sm text-(--fg) leading-relaxed">{latest.reason}</p>
      {latest.response && (
        <div
          className="rounded-md px-3 py-2 mt-3"
          style={{
            backgroundColor: isAccepted
              ? "var(--hb-green-muted)"
              : "var(--color-destructive-muted)",
          }}
        >
          <p
            className="text-xs font-semibold"
            style={{
              color: isAccepted
                ? "var(--hb-green-fg)"
                : "var(--color-destructive)",
            }}
          >
            Resposta da diretoria
          </p>
          <p
            className="text-xs leading-relaxed mt-0.5"
            style={{
              color: isAccepted
                ? "var(--hb-green-fg)"
                : "var(--color-destructive)",
            }}
          >
            {latest.response}
          </p>
        </div>
      )}
    </div>
  );
}
