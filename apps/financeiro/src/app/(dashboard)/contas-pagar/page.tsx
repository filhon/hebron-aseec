import {
  getPayables,
  getBatchApprovals,
  getBankAccounts,
  getCategories,
  getCostCenterOptions,
  AGGREGATE_FETCH_LIMIT,
} from "../../../lib/queries";
import { ContasPagarView } from "../../../components/contas-pagar-view";
import { PeriodFilter } from "../../../components/period-filter";

interface ContasPagarPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

// Sem filtro por padrão (diferente de Lançamentos): um payable "pendente" de
// vencimento antigo é justamente o que mais importa não desaparecer da tela
// quando ninguém pediu filtro nenhum. O usuário liga o filtro quando quiser.
export default async function ContasPagarPage({
  searchParams,
}: ContasPagarPageProps) {
  const sp = await searchParams;
  const from = sp.from;
  const to = sp.to;

  const [
    { items: payables, total },
    { items: batchApprovals },
    bankAccounts,
    categories,
    costCenters,
  ] = await Promise.all([
    getPayables({ from, to, limit: AGGREGATE_FETCH_LIMIT }),
    getBatchApprovals({ limit: AGGREGATE_FETCH_LIMIT }),
    getBankAccounts(),
    getCategories(),
    getCostCenterOptions(),
  ]);

  return (
    <ContasPagarView
      payables={payables}
      batchApprovals={batchApprovals}
      bankAccounts={bankAccounts}
      categories={categories}
      costCenters={costCenters}
      filterSlot={
        <PeriodFilter
          defaultFrom=""
          defaultTo=""
          total={total}
          label="contas a pagar (por vencimento)"
          clearLabel="Limpar filtro"
        />
      }
    />
  );
}
