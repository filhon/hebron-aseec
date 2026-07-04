import { db } from "@hebron/db/client";
import { bankAccounts } from "@hebron/db/schema";
import { eq } from "drizzle-orm";
import { requireColaboradorSession } from "../../../lib/session";
import { ImportWizard } from "../../../components/import-wizard";

export default async function ImportacaoPage() {
  await requireColaboradorSession();

  const accounts = await db
    .select({
      id: bankAccounts.id,
      bankName: bankAccounts.bankName,
      agency: bankAccounts.agency,
      accountNumber: bankAccounts.accountNumber,
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
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
          Importação OFX / CSV
        </p>
      </div>

      <div className="p-6">
        <ImportWizard accounts={accounts} />
      </div>
    </div>
  );
}
