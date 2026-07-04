"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { createReport } from "../actions/reports";

interface ReportRequestFormProps {
  projectId: string;
}

/** Diretor solicita um novo relatório periódico ao submissor (F2-P1). */
export function ReportRequestForm({ projectId }: ReportRequestFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { execute, isPending, result } = useAction(createReport, {
    onSuccess() {
      setOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      setDueDate("");
      router.refresh();
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-(--radius) border border-(--border) px-3 py-1.5 text-xs font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors"
      >
        <CalendarPlus className="w-3.5 h-3.5" aria-hidden />
        Solicitar relatório
      </button>
    );
  }

  return (
    <div className="rounded-md border border-(--border) bg-(--surface-alt) px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
        Solicitar Relatório
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-(--fg-muted) block mb-1">Início</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-2 py-1.5 text-xs text-(--fg)"
          />
        </div>
        <div>
          <label className="text-xs text-(--fg-muted) block mb-1">Fim</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-2 py-1.5 text-xs text-(--fg)"
          />
        </div>
        <div>
          <label className="text-xs text-(--fg-muted) block mb-1">Prazo</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-2 py-1.5 text-xs text-(--fg)"
          />
        </div>
      </div>
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
          disabled={!periodStart || !periodEnd || !dueDate || isPending}
          onClick={() =>
            execute({ projectId, periodStart, periodEnd, dueDate })
          }
          className="flex-1 rounded-(--radius) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-blue)" }}
        >
          {isPending ? "Solicitando…" : "Solicitar"}
        </button>
      </div>
    </div>
  );
}
