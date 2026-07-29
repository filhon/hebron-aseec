"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle, X, Landmark } from "lucide-react";
import { BatchApprovalCard } from "./batch-approval-card";
import { BatchApprovalForm } from "./batch-approval-form";
import { ExpenseForm } from "./expense-form";
import { PayableCard } from "./payable-card";
import { createWeeklyBatch, markPayableAsPaid } from "../actions/approval";
import type {
  AccountCategory,
  BankAccount,
  BatchApproval,
  Payable,
} from "@hebron/types/financeiro";
import type { CostCenterOption } from "../lib/queries";

type Tab = "pendente" | "aprovado" | "autorizado";

const TAB_LABEL: Record<Tab, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovados",
  autorizado: "Autorizados",
};

const TAB_DESC: Record<Tab, string> = {
  pendente:
    "Estes pagamentos aguardam a criação/aprovação do lote semanal pelo Diretor Gestor.",
  aprovado:
    "Aprovados pelo Diretor Gestor. Aguardam autorização do Diretor Autorizador.",
  autorizado:
    "Autorizados por ambas as camadas de governança. Prontos para pagamento.",
};

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

interface ContasPagarViewProps {
  payables: Payable[];
  batchApprovals: BatchApproval[];
  bankAccounts: BankAccount[];
  categories: AccountCategory[];
  costCenters: CostCenterOption[];
}

export function ContasPagarView({
  payables,
  batchApprovals,
  bankAccounts,
  categories,
  costCenters,
}: ContasPagarViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pendente");
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [batchFormFor, setBatchFormFor] = useState<{
    batch: BatchApproval;
    stage: "aprovar" | "autorizar";
  } | null>(null);
  const [payingPayable, setPayingPayable] = useState<Payable | null>(null);
  const [payAccountId, setPayAccountId] = useState("");

  const filtered = payables.filter((p) => p.status === activeTab);

  const pendingBatch = batchApprovals.find((b) => b.status === "pendente");
  const approvedBatch = batchApprovals.find((b) => b.status === "aprovado");

  const pendingCount = payables.filter((p) => p.status === "pendente").length;
  const approvedCount = payables.filter((p) => p.status === "aprovado").length;
  const authorizedCount = payables.filter(
    (p) => p.status === "autorizado",
  ).length;

  const TABS: { key: Tab; count: number }[] = [
    { key: "pendente", count: pendingCount },
    { key: "aprovado", count: approvedCount },
    { key: "autorizado", count: authorizedCount },
  ];

  const {
    execute: createBatch,
    isPending: isCreatingBatch,
    result: createBatchResult,
  } = useAction(createWeeklyBatch, {
    onSuccess() {
      router.refresh();
    },
  });

  const {
    execute: payAction,
    isPending: isPaying,
    result: payResult,
  } = useAction(markPayableAsPaid, {
    onSuccess() {
      router.refresh();
      setPayingPayable(null);
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
              Contas a pagar
            </p>
          </div>
          <button
            onClick={() => setExpenseFormOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-(--radius) text-xs font-semibold"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            <Plus className="h-3 w-3" />
            Novo pagamento
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {TABS.map(({ key, count }) => {
            const active = key === activeTab;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: active ? "var(--hb-blue)" : "transparent",
                  color: active ? "var(--fg-invert)" : "var(--fg-muted)",
                }}
              >
                {TAB_LABEL[key]}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: active
                        ? "var(--fg-invert-tint)"
                        : "var(--surface-alt)",
                      color: active ? "var(--fg-invert)" : "var(--fg-muted)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Stage info banner */}
        <div
          className="flex items-start gap-3 rounded-(--radius) border px-5 py-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div>
            <p
              className="text-sm font-bold mb-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {TAB_LABEL[activeTab]}
            </p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
              {TAB_DESC[activeTab]}
            </p>
          </div>
        </div>

        {/* Pendente tab */}
        {activeTab === "pendente" && (
          <>
            {pendingBatch ? (
              <BatchApprovalCard
                batch={pendingBatch}
                onSubmitForApproval={() =>
                  setBatchFormFor({ batch: pendingBatch, stage: "aprovar" })
                }
              />
            ) : pendingCount > 0 ? (
              <div
                className="flex items-center justify-between rounded-(--radius) border px-5 py-4"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                  {pendingCount} conta(s) a pagar aguardam a criação do lote
                  semanal desta semana.
                </p>
                <button
                  onClick={() => createBatch({ weekOffset: 0 })}
                  disabled={isCreatingBatch}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{
                    background: "var(--hb-blue)",
                    color: "var(--fg-invert)",
                  }}
                >
                  {isCreatingBatch ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Criar lote semanal
                </button>
              </div>
            ) : null}
            {createBatchResult.serverError && (
              <p className="flex items-center gap-1 text-xs font-medium text-(--hb-orange-deep)">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {createBatchResult.serverError}
              </p>
            )}
          </>
        )}

        {/* Aprovado tab */}
        {activeTab === "aprovado" && approvedBatch && (
          <BatchApprovalCard
            batch={approvedBatch}
            onMarkIncluded={() =>
              setBatchFormFor({ batch: approvedBatch, stage: "autorizar" })
            }
          />
        )}

        {/* Payables list */}
        {activeTab === "autorizado" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.length === 0 ? (
              <p
                className="text-sm col-span-2 text-center py-10"
                style={{ color: "var(--fg-muted)" }}
              >
                Nenhum pagamento autorizado pendente de registro.
              </p>
            ) : (
              filtered.map((p) => (
                <PayableCard
                  key={p.id}
                  payable={p}
                  onAction={(action) => {
                    if (action === "pay") {
                      setPayAccountId(bankAccounts[0]?.id ?? "");
                      setPayingPayable(p);
                    }
                  }}
                />
              ))
            )}
          </div>
        ) : (
          <div
            className="rounded-(--radius) border overflow-hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="text-sm font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                {filtered.length} pagamento{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p
                  className="font-bold mb-1"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--fg)",
                  }}
                >
                  Nenhum pagamento aqui
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
                        "Descrição / Fornecedor",
                        "Vencimento",
                        "Status",
                        "Valor",
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
                            textAlign: i === 3 ? "right" : "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: "1px solid var(--divider)" }}
                      >
                        <td className="px-4 py-3.5">
                          <p
                            className="font-semibold text-sm"
                            style={{ color: "var(--fg)" }}
                          >
                            {p.description}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            {p.supplierName}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3.5 text-xs"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {p.dueAt.toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                p.status === "pendente"
                                  ? "var(--hb-orange-muted)"
                                  : "var(--hb-cyan-muted)",
                              color:
                                p.status === "pendente"
                                  ? "var(--hb-orange-deep)"
                                  : "var(--hb-cyan-deep)",
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3.5 text-right font-bold tabular-nums text-sm"
                          style={{ color: "var(--fg)" }}
                        >
                          {fmtBRL(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forms */}
      {expenseFormOpen && (
        <ExpenseForm
          categories={categories}
          costCenters={costCenters}
          onClose={() => setExpenseFormOpen(false)}
        />
      )}
      {batchFormFor && (
        <BatchApprovalForm
          batch={batchFormFor.batch}
          stage={batchFormFor.stage}
          onClose={() => setBatchFormFor(null)}
        />
      )}

      {/* Pay dialog */}
      {payingPayable && (
        <div
          className="fixed inset-0 z-(--z-overlay) flex items-center justify-center"
          style={{ background: "var(--overlay)" }}
          onClick={() => setPayingPayable(null)}
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
                  Marcar como pago
                </p>
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {payingPayable.description}
                </p>
              </div>
              <button onClick={() => setPayingPayable(null)}>
                <X className="h-4 w-4" style={{ color: "var(--fg-muted)" }} />
              </button>
            </div>

            <label
              className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Conta bancária de origem
            </label>
            <select
              value={payAccountId}
              onChange={(e) => setPayAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-(--radius) border text-sm mb-4 border-(--border) bg-(--bg) text-(--fg)"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank} — ag. {a.agency}
                </option>
              ))}
            </select>

            {payResult.serverError && (
              <p className="flex items-center gap-1 text-xs font-medium mb-3 text-(--hb-orange-deep)">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {payResult.serverError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPayingPayable(null)}
                className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold border-(--border) text-(--fg)"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  payAction({
                    payableId: payingPayable.id,
                    bankAccountId: payAccountId,
                  })
                }
                disabled={isPaying || !payAccountId}
                className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold disabled:opacity-60"
                style={{
                  background: "var(--hb-green)",
                  color: "var(--hb-blue)",
                }}
              >
                {isPaying ? "Registrando…" : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
