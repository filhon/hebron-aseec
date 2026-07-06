import {
  getReceivables,
  getCategories,
  getCostCenterOptions,
  getBankAccounts,
} from "../../../lib/queries";
import { ReceivablesView } from "../../../components/receivables-view";

export default async function ContasReceberPage() {
  const [receivables, categories, costCenters, bankAccounts] =
    await Promise.all([
      getReceivables(),
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
    />
  );
}
