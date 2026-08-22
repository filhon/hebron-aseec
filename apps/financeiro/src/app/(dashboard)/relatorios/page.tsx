import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import {
  getTransactions,
  getCategories,
  getBankAccounts,
  AGGREGATE_FETCH_LIMIT,
} from "../../../lib/queries";
import { RelatoriosView } from "../../../components/relatorios-view";

export default async function RelatoriosPage() {
  const [{ items: transactions }, categories, bankAccounts] = await Promise.all(
    [
      getTransactions({ limit: AGGREGATE_FETCH_LIMIT }),
      getCategories(),
      getBankAccounts(),
    ],
  );

  const cookieStore = await cookies();
  const session = await resolveSession(cookieStore);
  const canExport = session.roles.includes("super_admin");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      <div
        className="border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
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
          Demonstrativos
        </p>
      </div>

      <RelatoriosView
        transactions={transactions}
        categories={categories}
        bankAccounts={bankAccounts}
        canExport={canExport}
      />
    </div>
  );
}
