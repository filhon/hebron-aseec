"use client";

import { useState } from "react";
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Plus,
  Check,
} from "lucide-react";
import { mockPayables, mockBatchApprovals } from "../../../lib/mock-data";
import { BatchApprovalCard } from "../../../components/batch-approval-card";
import type { PayableStatus } from "@hebron/types/financeiro";

type Tab = "pendente" | "aprovado" | "autorizado";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDueCls(dueAt: Date): { bg: string; color: string; label: string } {
  const diff = Math.ceil(
    (dueAt.getTime() - new Date("2026-06-01").getTime()) / 86_400_000,
  );
  if (diff < 0)
    return {
      bg: "var(--color-destructive-muted)",
      color: "var(--color-destructive)",
      label: "Vencido",
    };
  if (diff <= 3)
    return {
      bg: "var(--hb-orange-muted)",
      color: "var(--hb-orange-deep)",
      label: `${diff}d`,
    };
  if (diff <= 7)
    return {
      bg: "var(--hb-cyan-muted)",
      color: "var(--hb-cyan-deep)",
      label: `${diff}d`,
    };
  return {
    bg: "var(--hb-green-muted)",
    color: "var(--hb-green-deep)",
    label: `${diff}d`,
  };
}

const STATUS_LABEL: Record<PayableStatus, string> = {
  pendente: "Aguardando",
  aprovado: "Aprovado",
  autorizado: "Autorizado",
  pago: "Pago",
  cancelado: "Cancelado",
};

const TAB_INFO: Record<
  Tab,
  { label: string; icon: React.ReactNode; desc: string; alertColor: string }
> = {
  pendente: {
    label: "Aguardando aprovação",
    icon: <AlertCircle className="h-4 w-4" />,
    desc: "Estes pagamentos aguardam aprovação do Diretor Gestor. Somente após aprovação seguem para autorização.",
    alertColor: "var(--hb-orange)",
  },
  aprovado: {
    label: "Aprovados",
    icon: <CheckCircle2 className="h-4 w-4" />,
    desc: "Aprovados pelo Diretor Gestor. Aguardam autorização do Diretor Autorizador para seguir para pagamento.",
    alertColor: "var(--hb-cyan-deep)",
  },
  autorizado: {
    label: "Autorizados",
    icon: <Banknote className="h-4 w-4" />,
    desc: "Autorizados por ambas as camadas de governança. Prontos para registro de pagamento pelo super_admin.",
    alertColor: "var(--hb-green-deep)",
  },
};

export default function ContasPagarPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pendente");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = mockPayables.filter(
    (p) =>
      p.status === activeTab ||
      (activeTab === "pendente" && p.status === "pendente"),
  );

  const pendingBatch = mockBatchApprovals.find((b) => b.status === "pendente");
  const approvedBatch = mockBatchApprovals.find((b) => b.status === "aprovado");

  const pendingCount = mockPayables.filter(
    (p) => p.status === "pendente",
  ).length;
  const approvedCount = mockPayables.filter(
    (p) => p.status === "aprovado",
  ).length;
  const authorizedCount = mockPayables.filter(
    (p) => p.status === "autorizado",
  ).length;

  const TABS: { key: Tab; count: number }[] = [
    { key: "pendente", count: pendingCount },
    { key: "aprovado", count: approvedCount },
    { key: "autorizado", count: authorizedCount },
  ];

  const totalSelected = mockPayables
    .filter((p) => selected.has(p.id))
    .reduce((s, p) => s + p.amount, 0);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  const info = TAB_INFO[activeTab];

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
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
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
                onClick={() => {
                  setActiveTab(key);
                  setSelected(new Set());
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: active ? "var(--hb-blue)" : "transparent",
                  color: active ? "var(--fg-invert)" : "var(--fg-muted)",
                }}
              >
                {TAB_INFO[key].label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: active
                        ? "rgba(255,255,255,0.2)"
                        : "var(--surface-alt)",
                      color: active ? "#fff" : "var(--fg-muted)",
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
          className="flex items-start gap-3 rounded-xl border px-5 py-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0"
            style={{ background: info.alertColor }}
          >
            {info.icon}
          </span>
          <div>
            <p
              className="text-sm font-bold mb-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {info.label}
            </p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
              {info.desc}
            </p>
          </div>
        </div>

        {/* Batch card for pending stage */}
        {activeTab === "pendente" && pendingBatch && (
          <BatchApprovalCard
            batch={pendingBatch}
            userRole="diretor"
            onSubmitForApproval={() => {}}
            onMarkIncluded={() => {}}
            onMarkPaid={() => {}}
          />
        )}

        {/* Batch card for approved stage */}
        {activeTab === "aprovado" && approvedBatch && (
          <BatchApprovalCard
            batch={approvedBatch}
            userRole="diretor"
            onSubmitForApproval={() => {}}
            onMarkIncluded={() => {}}
            onMarkPaid={() => {}}
          />
        )}

        {/* Payables table */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <p
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {filtered.length} pagamento{filtered.length !== 1 ? "s" : ""}
            </p>
            {selected.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {selected.size} selecionado{selected.size !== 1 ? "s" : ""} ·{" "}
                  {fmtBRL(totalSelected)}
                </span>
                {activeTab === "pendente" && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: "var(--hb-blue)",
                      color: "var(--fg-invert)",
                    }}
                  >
                    <Check className="h-3 w-3" />
                    Enviar para aprovação
                  </button>
                )}
                {activeTab === "aprovado" && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "var(--hb-cyan-deep)", color: "#fff" }}
                  >
                    <Check className="h-3 w-3" />
                    Autorizar selecionados
                  </button>
                )}
              </div>
            )}
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
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                {activeTab === "pendente"
                  ? "Todos os pagamentos foram encaminhados para aprovação."
                  : activeTab === "aprovado"
                    ? "Nenhum pagamento aguarda autorização."
                    : "Nenhum pagamento autorizado pendente de registro."}
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
                    <th
                      className="border-b px-4 py-2.5"
                      style={{
                        background: "var(--bg)",
                        borderColor: "var(--border)",
                        width: 40,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected.size === filtered.length &&
                          filtered.length > 0
                        }
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 accent-(--hb-blue)"
                      />
                    </th>
                    {[
                      "Descrição / Fornecedor",
                      "Categoria",
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
                          textAlign: i === 4 ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const due = getDueCls(p.dueAt);
                    const isSelected = selected.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        className="transition-colors"
                        style={{
                          background: isSelected
                            ? "rgba(32,44,133,0.04)"
                            : undefined,
                          borderBottom: "1px solid var(--divider)",
                        }}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const next = new Set(selected);
                              if (isSelected) next.delete(p.id);
                              else next.add(p.id);
                              setSelected(next);
                            }}
                            className="h-3.5 w-3.5"
                          />
                        </td>
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
                          {p.categoryId ?? "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                            style={{ background: due.bg, color: due.color }}
                          >
                            <Calendar className="h-3 w-3" />
                            {fmtDate(p.dueAt)} · {due.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                p.status === "pendente"
                                  ? "var(--hb-orange-muted)"
                                  : p.status === "aprovado"
                                    ? "var(--hb-cyan-muted)"
                                    : "var(--hb-green-muted)",
                              color:
                                p.status === "pendente"
                                  ? "var(--hb-orange-deep)"
                                  : p.status === "aprovado"
                                    ? "var(--hb-cyan-deep)"
                                    : "var(--hb-green-deep)",
                            }}
                          >
                            {STATUS_LABEL[p.status]}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3.5 text-right font-bold tabular-nums text-sm"
                          style={{ color: "var(--fg)" }}
                        >
                          {fmtBRL(p.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        Total ({filtered.length} itens)
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 border-t text-right font-bold tabular-nums"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--fg)",
                      }}
                    >
                      {fmtBRL(filtered.reduce((s, p) => s + p.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
