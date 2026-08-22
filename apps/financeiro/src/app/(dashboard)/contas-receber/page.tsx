import {
  getReceivables,
  getCategories,
  getCostCenterOptions,
  getBankAccounts,
  AGGREGATE_FETCH_LIMIT,
} from "../../../lib/queries";
import { ReceivablesView } from "../../../components/receivables-view";
import { PeriodFilter } from "../../../components/period-filter";

interface ContasReceberPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

// Sem filtro por padrão (mesmo raciocínio de Contas a Pagar): um recebível
// pendente de previsão antiga não pode sumir da tela sem o usuário pedir.
export default async function ContasReceberPage({
  searchParams,
}: ContasReceberPageProps) {
  const sp = await searchParams;
  const from = sp.from;
  const to = sp.to;

  const [{ items: receivables, total }, categories, costCenters, bankAccounts] =
    await Promise.all([
      getReceivables({ from, to, limit: AGGREGATE_FETCH_LIMIT }),
      getCategories(),
      getCostCenterOptions(),
      getBankAccounts(),
    ]);

  return (
    <ReceivablesView
      receivables={receivables}
      categories={categories}
      costCenters={costCenters}
      bankAccounts={bankAccounts}
      filterSlot={
        <PeriodFilter
          defaultFrom=""
          defaultTo=""
          total={total}
          label="contas a receber (por previsão)"
          clearLabel="Limpar filtro"
        />
      }
    />
  );
}
