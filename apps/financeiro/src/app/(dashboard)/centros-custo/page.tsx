import { FolderOpen, ArrowRight, Dot } from "lucide-react";
import {
  getCostCenterOptions,
  getTransactions,
  getBudgets,
  getPayables,
} from "../../../lib/queries";
import { NewCostCenterButton } from "../../../components/cost-center-form";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function PctBar({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
        Sem orçamento
      </span>
    );
  }
  const color =
    pct >= 90
      ? "var(--hb-orange)"
      : pct >= 70
        ? "var(--hb-cyan)"
        : "var(--hb-green)";
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-alt)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span
        className="text-xs tabular-nums font-semibold shrink-0 w-10 text-right"
        style={{
          color: pct >= 90 ? "var(--hb-orange-deep)" : "var(--fg-muted)",
        }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function StatusDot({ hasProject }: { hasProject: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{
        background: hasProject ? "var(--hb-cyan-muted)" : "var(--surface-alt)",
        color: hasProject ? "var(--hb-cyan)" : "var(--fg-muted)",
      }}
    >
      <Dot className="h-3 w-3 -ml-1" />
      {hasProject ? "Projeto" : "Geral"}
    </span>
  );
}

export default async function CentrosCustoPage() {
  const [costCenters, transactions, budgets, payables] = await Promise.all([
    getCostCenterOptions(),
    getTransactions(),
    getBudgets(),
    getPayables(),
  ]);

  const rows = costCenters.map((cc) => {
    const spent = transactions
      .filter((t) => t.type === "debito" && t.costCenterId === cc.id)
      .reduce((s, t) => s + t.amount, 0);

    const budget = budgets.find((b) => b.costCenterId === cc.id);
    const budgeted = budget?.totalAmount ?? null;

    const pendingPayables = payables.filter(
      (p) =>
        p.costCenterId === cc.id &&
        (p.status === "pendente" ||
          p.status === "aprovado" ||
          p.status === "autorizado"),
    ).length;

    const pct = budgeted && budgeted > 0 ? (spent / budgeted) * 100 : null;

    return { cc, spent, budgeted, pct, pendingPayables };
  });

  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalBudgeted = rows
    .filter((r) => r.budgeted !== null)
    .reduce((s, r) => s + (r.budgeted ?? 0), 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
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
              Centros de custo
            </p>
          </div>
          <NewCostCenterButton />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className="rounded-(--radius) border p-5"
            style={{
              background: "var(--hb-blue)",
              borderColor: "transparent",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--fg-invert-muted)" }}
            >
              Total executado
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg-invert)",
              }}
            >
              {fmtBRL(totalSpent)}
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
              Total orçado
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg)",
              }}
            >
              {fmtBRL(totalBudgeted)}
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
              Centros cadastrados
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--fg)",
              }}
            >
              {costCenters.length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-(--radius) border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center gap-3 px-5 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <FolderOpen
              className="h-4 w-4"
              style={{ color: "var(--hb-blue)" }}
            />
            <p
              className="font-bold text-sm"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Todos os centros de custo
            </p>
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--fg-muted)" }}
            >
              {rows.length} centros
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Nenhum centro de custo cadastrado ainda. Centros de projeto são
                criados automaticamente na aprovação; para custeio
                administrativo (aluguel, folha, energia, manutenção), use "Novo
                centro de custo" acima.
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
                      "Código",
                      "Nome",
                      "Tipo",
                      "Executado",
                      "Orçamento",
                      "Uso",
                      "Pendentes",
                      "",
                    ].map((h, i) => (
                      <th
                        key={h + i}
                        className="border-b px-4 py-2.5 text-left"
                        style={{
                          background: "var(--bg)",
                          borderColor: "var(--border)",
                          color: "var(--fg-muted)",
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ cc, spent, budgeted, pct, pendingPayables }) => (
                    <tr
                      key={cc.id}
                      style={{ borderBottom: "1px solid var(--divider)" }}
                    >
                      <td
                        className="px-4 py-3.5 font-mono text-xs font-bold"
                        style={{ color: "var(--hb-blue)" }}
                      >
                        {cc.code}
                      </td>
                      <td
                        className="px-4 py-3.5 font-semibold max-w-56 truncate"
                        style={{ color: "var(--fg)" }}
                      >
                        {cc.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusDot hasProject={cc.projectId !== null} />
                      </td>
                      <td
                        className="px-4 py-3.5 tabular-nums font-semibold"
                        style={{ color: "var(--fg)" }}
                      >
                        {fmtBRL(spent)}
                      </td>
                      <td
                        className="px-4 py-3.5 tabular-nums"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {budgeted !== null ? fmtBRL(budgeted) : "—"}
                      </td>
                      <td className="px-4 py-3.5 min-w-40">
                        <PctBar pct={pct} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {pendingPayables > 0 ? (
                          <span
                            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold"
                            style={{
                              background: "var(--hb-orange)",
                              color: "var(--fg-invert)",
                            }}
                          >
                            {pendingPayables}
                          </span>
                        ) : (
                          <span style={{ color: "var(--fg-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {cc.projectId && (
                          <a
                            href={`https://projetos.hebronaseec.com.br/projeto/${cc.projectId}`}
                            className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap"
                            style={{ color: "var(--hb-blue)" }}
                          >
                            Ver projeto <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer total */}
          <div
            className="flex items-center justify-between px-5 py-3 border-t"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-alt)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Total consolidado
            </p>
            <p
              className="text-base font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--hb-blue)",
              }}
            >
              {fmtBRL(totalSpent)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
