import {
  getPayables,
  getBatchApprovals,
  getBankAccounts,
  getCategories,
  getCostCenterOptions,
} from "../../../lib/queries";
import { ContasPagarView } from "../../../components/contas-pagar-view";

export default async function ContasPagarPage() {
  const [payables, batchApprovals, bankAccounts, categories, costCenters] =
    await Promise.all([
      getPayables(),
      getBatchApprovals(),
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
    />
  );
}
