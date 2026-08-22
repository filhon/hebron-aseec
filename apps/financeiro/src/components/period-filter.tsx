"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// PeriodFilter — filtro de período (De/Até) compartilhado pelas telas de
// lançamento do Financeiro (Lançamentos, Contas a Pagar, Contas a Receber).
// Mesmo padrão de apps/admin/src/components/audit-log-filters.tsx: form
// controlado, aplica via searchParams (?from=&to=), Server Component lê e
// refaz a query já filtrada (D4-003 — nenhuma listagem tinha filtro de
// período).
// ---------------------------------------------------------------------------

export interface PeriodFilterProps {
  defaultFrom: string;
  defaultTo: string;
  total: number;
  label?: string;
  clearLabel?: string;
}

export function PeriodFilter({
  defaultFrom,
  defaultTo,
  total,
  label = "lançamentos",
  clearLabel = "Mês corrente",
}: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = React.useState(
    searchParams.get("from") ?? defaultFrom,
  );
  const [to, setTo] = React.useState(searchParams.get("to") ?? defaultTo);

  const isCustom =
    searchParams.get("from") !== null || searchParams.get("to") !== null;

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    setFrom(defaultFrom);
    setTo(defaultTo);
    router.push(pathname);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-(--radius) border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <label className="flex flex-col gap-1">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.06em]"
          style={{ color: "var(--fg-muted)" }}
        >
          De
        </span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-md border px-2.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.06em]"
          style={{ color: "var(--fg-muted)" }}
        >
          Até
        </span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-md border px-2.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
      </label>
      <button
        type="submit"
        className="h-9 rounded-md px-4 text-sm font-semibold"
        style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
      >
        Filtrar
      </button>
      {isCustom && (
        <button
          type="button"
          onClick={clear}
          className="h-9 rounded-md border px-4 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
        >
          {clearLabel}
        </button>
      )}
      <span
        className="ml-auto self-center text-xs"
        style={{ color: "var(--fg-muted)" }}
      >
        <b style={{ color: "var(--fg)" }}>{total}</b> {label} no período
      </span>
    </form>
  );
}
