import { getTasks } from "../../../lib/queries";
import { CalendarioClient } from "./calendario-client";

export default async function CalendarioPage() {
  const tasks = await getTasks();
  return <CalendarioClient tasks={tasks} />;
}
