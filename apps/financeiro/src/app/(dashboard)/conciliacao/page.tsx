import { Suspense } from "react";
import Link from "next/link";
import { Upload, CheckCircle2 } from "lucide-react";
import {
  getLatestBankImport,
  getTransactionsForAccount,
} from "../../../lib/queries";
import { ConciliationView } from "../../../components/conciliation-view";
import { ConciliationSkeleton } from "../../../components/conciliation-skeleton";

function EmptyNoImport() {
  return (
    <div
      className="flex flex-col items-center text-center rounded-(--radius) border py-20 px-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-(--radius) mb-6"
        style={{ background: "var(--brand-tint)" }}
      >
        <Upload className="h-8 w-8" style={{ color: "var(--hb-blue)" }} />
      </div>
      <p
        className="text-xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
      >
        Importe seu primeiro extrato bancário
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--fg-muted)" }}>
        Faça upload de um arquivo OFX ou CSV para iniciar a conciliação
        automática com seus lançamentos registrados.
      </p>
      <Link
        href="/importacao"
        className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold"
        style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
      >
        <Upload className="h-4 w-4" />
        Importar extrato
      </Link>
      <div
        className="mt-10 w-full max-w-sm rounded-(--radius) px-5 py-4 text-left"
        style={{ background: "var(--hb-blue)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
          style={{ color: "var(--hb-cyan)" }}
        >
          Mordomia cristã
        </p>
        <p
          className="leading-relaxed italic"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            color: "var(--fg-invert)",
          }}
        >
          &quot;Sede fiéis no pouco, e sereis fiéis no muito.&quot;
        </p>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mt-2"
          style={{ color: "var(--fg-invert-muted)" }}
        >
          Lucas 16:10
        </p>
      </div>
    </div>
  );
}

function EmptyAllConciliated() {
  return (
    <div
      className="flex flex-col items-center text-center rounded-(--radius) border py-20 px-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-(--radius) mb-6"
        style={{ background: "var(--hb-green)" }}
      >
        <CheckCircle2 className="h-8 w-8" style={{ color: "var(--hb-blue)" }} />
      </div>
      <p
        className="text-xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
      >
        Todas as transações estão conciliadas
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--fg-muted)" }}>
        Excelente! Não há itens pendentes de conciliação neste extrato. Importe
        um novo extrato para continuar.
      </p>
      <Link
        href="/importacao"
        className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) border text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
      >
        Importar novo extrato
      </Link>
      <div
        className="mt-10 w-full max-w-sm rounded-(--radius) px-5 py-4 text-left"
        style={{ background: "var(--hb-blue)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
          style={{ color: "var(--hb-cyan)" }}
        >
          Mordomia cristã
        </p>
        <p
          className="leading-relaxed italic"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            color: "var(--fg-invert)",
          }}
        >
          &quot;Onde não há bois, o celeiro está vazio; mas pela força do boi há
          abundância nas colheitas.&quot;
        </p>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mt-2"
          style={{ color: "var(--fg-invert-muted)" }}
        >
          Provérbios 14:4
        </p>
      </div>
    </div>
  );
}

async function ConciliationContent() {
  const result = await getLatestBankImport();

  if (!result) return <EmptyNoImport />;

  const { bankImport, bankAccount } = result;

  if (bankImport.pendingItems === 0) return <EmptyAllConciliated />;

  const transactions = await getTransactionsForAccount(bankAccount.id);

  return (
    <ConciliationView
      bankAccount={bankAccount}
      bankImport={bankImport}
      transactions={transactions}
    />
  );
}

export default function ConciliacaoPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
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
            Conciliação bancária
          </p>
        </div>
      </div>

      <div className="p-6">
        <Suspense fallback={<ConciliationSkeleton />}>
          <ConciliationContent />
        </Suspense>
      </div>
    </div>
  );
}
