"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { resolveSubmitterContestation } from "../actions/projects";

interface SubmitterContestationItem {
  id: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  response: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

interface SubmitterContestationPanelProps {
  contestations: SubmitterContestationItem[];
}

function ResolveForm({ contestationId }: { contestationId: string }) {
  const router = useRouter();
  const [response, setResponse] = useState("");

  const { execute, isPending, result } = useAction(
    resolveSubmitterContestation,
    {
      onSuccess() {
        setResponse("");
        router.refresh();
      },
    },
  );

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        rows={2}
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Resposta ao submissor (mín. 10 caracteres)…"
        className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none"
      />
      {result.serverError && (
        <p className="text-xs text-(--color-destructive)">
          {result.serverError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={response.trim().length < 10 || isPending}
          onClick={() =>
            execute({
              contestationId,
              decision: "accepted",
              response: response.trim(),
            })
          }
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-(--radius) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-green)" }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
          Aceitar
        </button>
        <button
          type="button"
          disabled={response.trim().length < 10 || isPending}
          onClick={() =>
            execute({
              contestationId,
              decision: "rejected",
              response: response.trim(),
            })
          }
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-(--radius) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--color-destructive)" }}
        >
          <XCircle className="w-3.5 h-3.5" aria-hidden />
          Rejeitar
        </button>
      </div>
    </div>
  );
}

/**
 * Fila de contestações do submissor para o super_admin resolver (P-2.17
 * CORRETIVO, PATCH-029, Q32: "notificações para os super-admins para que
 * eles respondam"). Sem página de fila dedicada — a notificação já leva o
 * super_admin direto ao projeto, e este painel mostra o histórico completo
 * (mais recente primeiro), com o formulário de resposta só na pendente.
 */
export function SubmitterContestationPanel({
  contestations,
}: SubmitterContestationPanelProps) {
  if (contestations.length === 0) return null;

  return (
    <div className="rounded-md border border-(--hb-orange) bg-(--hb-orange-muted) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--hb-orange-deep) mb-3 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        Contestação do Submissor ({contestations.length})
      </p>
      <div className="flex flex-col gap-3">
        {contestations.map((c) => {
          const isAccepted = c.status === "accepted";
          return (
            <div
              key={c.id}
              className="rounded-md border border-(--border) bg-(--surface) px-3 py-3"
            >
              <p className="text-sm text-(--fg) leading-relaxed">{c.reason}</p>
              {c.status === "pending" ? (
                <ResolveForm contestationId={c.id} />
              ) : (
                <div
                  className="rounded-md px-3 py-2 mt-2"
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
                    {isAccepted ? "Aceita" : "Rejeitada"} — sua resposta
                  </p>
                  <p
                    className="text-xs leading-relaxed mt-0.5"
                    style={{
                      color: isAccepted
                        ? "var(--hb-green-fg)"
                        : "var(--color-destructive)",
                    }}
                  >
                    {c.response}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
