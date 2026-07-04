"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, Loader2 } from "lucide-react";
import {
  createOrganizationBudget,
  updateOrganizationBudget,
} from "../actions/organization-budgets";

interface BudgetRow {
  id: string;
  organizationId: string;
  organizationName: string;
  year: number;
  amount: string;
}

interface OrganizationOption {
  id: string;
  nome: string;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function OrganizationBudgetsManager({
  budgets,
  organizations,
}: {
  budgets: BudgetRow[];
  organizations: OrganizationOption[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState("");

  const { execute: create, isPending: isCreating } = useAction(
    createOrganizationBudget,
    {
      onSuccess() {
        setCreating(false);
        setAmount("");
        router.refresh();
      },
    },
  );

  const { execute: update, isPending: isUpdating } = useAction(
    updateOrganizationBudget,
    {
      onSuccess() {
        setEditingId(null);
        router.refresh();
      },
    },
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div
        className="rounded-(--radius) border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Instituição", "Ano", "Orçamento", ""].map((h, i) => (
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
                    textAlign: i === 2 ? "right" : "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Nenhum orçamento cadastrado ainda.
                </td>
              </tr>
            )}
            {budgets.map((b) => {
              const isEditing = editingId === b.id;
              return (
                <tr
                  key={b.id}
                  style={{ borderBottom: "1px solid var(--divider)" }}
                >
                  <td className="px-4 py-3" style={{ color: "var(--fg)" }}>
                    {b.organizationName}
                  </td>
                  <td
                    className="px-4 py-3 tabular-nums"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {b.year}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={b.amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-32 px-2 py-1 rounded-(--radius) border text-sm text-right border-(--border) bg-(--bg) text-(--fg)"
                      />
                    ) : (
                      <span
                        className="font-bold"
                        style={{ color: "var(--fg)" }}
                      >
                        {fmtBRL(parseFloat(b.amount))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            update({
                              organizationBudgetId: b.id,
                              amount: parseFloat(amount || b.amount),
                            })
                          }
                          style={{ color: "var(--hb-green-deep)" }}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ color: "var(--fg-muted)" }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(b.id);
                          setAmount(b.amount);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "var(--hb-blue)" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating ? (
        <div
          className="rounded-(--radius) border p-4 space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="grid grid-cols-3 gap-3">
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="px-3 py-2 rounded-(--radius) border text-sm border-(--border) bg-(--bg) text-(--fg)"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              placeholder="Ano"
              className="px-3 py-2 rounded-(--radius) border text-sm border-(--border) bg-(--bg) text-(--fg)"
            />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$)"
              className="px-3 py-2 rounded-(--radius) border text-sm border-(--border) bg-(--bg) text-(--fg)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-(--radius) border text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
            >
              Cancelar
            </button>
            <button
              disabled={isCreating || !organizationId || !amount}
              onClick={() =>
                create({ organizationId, year, amount: parseFloat(amount) })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-(--radius) text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-(--radius) border text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--hb-blue)" }}
        >
          <Plus className="h-4 w-4" />
          Novo orçamento
        </button>
      )}
    </div>
  );
}
