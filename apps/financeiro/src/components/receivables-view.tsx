"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  CheckCircle2,
  X,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { RevenueForm } from "./revenue-form";
import { markReceivableReceived } from "../actions/transactions";
import type { AccountCategory, BankAccount } from "@hebron/types/financeiro";
import type { CostCenterOption, ReceivableRow } from "../lib/queries";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date | null): string {
  return d
    ? d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
}

const STATUS_LABEL: Record<ReceivableRow["status"], string> = {
  pendente: "Aguardando",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

interface ReceivablesViewProps {
  receivables: ReceivableRow[];
  categories: AccountCategory[];
  costCenters: CostCenterOption[];
  bankAccounts: BankAccount[];
}

export function ReceivablesView({
  receivables,
  categories,
  costCenters,
  bankAccounts,
}: ReceivablesViewProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [receiving, setReceiving] = useState<ReceivableRow | null>(null);
  const [bankAccountId, setBankAccountId] = useState("");

  const pending = receivables.filter((r) => r.status === "pendente");
  const totalPending = pending.reduce((s, r) => s + r.amount, 0);
  const received = receivables.filter((r) => r.status === "recebido");
  const totalReceived = received.reduce((s, r) => s + r.amount, 0);

  const { execute, isPending, result } = useAction(markReceivableReceived, {
    onSuccess() {
      router.refresh();
      setReceiving(null);
    },
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Financeiro
            </p>
            <p
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Contas a receber
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-(--radius) text-xs font-semibold"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            <Plus className="h-3 w-3" />
            Novo recebimento
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className="rounded-(--radius) border p-5"
            style={{ background: "var(--hb-blue)", borderColor: "transparent" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Aguardando recebimento
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg-invert)",
              }}
            >
              {fmtBRL(totalPending)}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {pending.length} conta{pending.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div
            className="rounded-(--radius) border p-5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              Recebido
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {fmtBRL(totalReceived)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
              {received.length} conta{received.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div
            className="rounded-(--radius) border p-5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              Total de contas
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {receivables.length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-(--radius) border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {receivables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p
                className="font-bold mb-1"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                Nenhuma conta a receber
              </p>
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Registre um novo recebimento esperado para começar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ borderCollapse: "separate", borderSpacing: 0 }}
              >
                <thead>
                  <tr>
                    {[
                      "Descrição",
                      "Categoria",
                      "Previsão",
                      "Status",
                      "Valor",
                      "",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className="border-b px-4 py-2.5 text-left"
                        style={{
                          background: "var(--bg)",
                          borderColor: "var(--border)",
                          color: "var(--fg-muted)",
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          textAlign: i === 4 ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid var(--divider)" }}
                    >
                      <td
                        className="px-4 py-3.5 font-semibold"
                        style={{ color: "var(--fg)" }}
                      >
                        {r.description}
                      </td>
                      <td
                        className="px-4 py-3.5 text-xs"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {r.categoryName ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                          style={{
                            background: "var(--hb-cyan-muted)",
                            color: "var(--hb-cyan-deep)",
                          }}
                        >
                          <Calendar className="h-3 w-3" />
                          {fmtDate(r.expectedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              r.status === "recebido"
                                ? "var(--hb-green-muted)"
                                : "var(--hb-orange-muted)",
                            color:
                              r.status === "recebido"
                                ? "var(--hb-green-deep)"
                                : "var(--hb-orange-deep)",
                          }}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 text-right font-bold tabular-nums"
                        style={{ color: "var(--fg)" }}
                      >
                        {fmtBRL(r.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {r.status === "pendente" && (
                          <button
                            onClick={() => {
                              setBankAccountId(bankAccounts[0]?.id ?? "");
                              setReceiving(r);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto"
                            style={{
                              background: "var(--hb-green)",
                              color: "var(--hb-blue)",
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Marcar recebido
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <RevenueForm
          categories={categories}
          costCenters={costCenters}
          bankAccounts={bankAccounts}
          onClose={() => setFormOpen(false)}
        />
      )}

      {receiving && (
        <div
          className="fixed inset-0 z-(--z-overlay) flex items-center justify-center"
          style={{ background: "rgba(19,23,55,0.42)" }}
          onClick={() => setReceiving(null)}
        >
          <div
            className="w-100 max-w-full rounded-(--radius) p-6"
            style={{ background: "var(--bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-(--radius)"
                style={{
                  background: "var(--hb-green)",
                  color: "var(--hb-blue)",
                }}
              >
                <Landmark className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--fg)" }}>
                  Marcar como recebido
                </p>
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {receiving.description}
                </p>
              </div>
              <button onClick={() => setReceiving(null)}>
                <X className="h-4 w-4" style={{ color: "var(--fg-muted)" }} />
              </button>
            </div>

            <label
              className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Conta bancária de destino
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-(--radius) border text-sm mb-4 border-(--border) bg-(--bg) text-(--fg)"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank} — ag. {a.agency}
                </option>
              ))}
            </select>

            {result.serverError && (
              <p className="flex items-center gap-1 text-xs font-medium mb-3 text-(--hb-orange-deep)">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {result.serverError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setReceiving(null)}
                className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold border-(--border) text-(--fg)"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  execute({
                    receivableId: receiving.id,
                    bankAccountId,
                    receivedDate: new Date(),
                  })
                }
                disabled={isPending || !bankAccountId}
                className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold disabled:opacity-60"
                style={{
                  background: "var(--hb-green)",
                  color: "var(--hb-blue)",
                }}
              >
                {isPending ? "Registrando…" : "Confirmar recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
