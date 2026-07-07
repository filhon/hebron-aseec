import { getRecurrenceRuleViews, getTaskTemplates } from "../../../lib/queries";
import { RecorrentesClient } from "./recorrentes-client";

export default async function RecorrentesPage() {
  const [rules, templates] = await Promise.all([
    getRecurrenceRuleViews(),
    getTaskTemplates(),
  ]);

  return <RecorrentesClient rules={rules} templates={templates} />;
}
