import { getTaskTemplates } from "../../../lib/queries";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const templates = await getTaskTemplates();
  return <TemplatesClient templates={templates} />;
}
