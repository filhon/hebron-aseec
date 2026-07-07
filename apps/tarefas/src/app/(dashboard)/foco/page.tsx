import { getAssignedTasks, requireStaffSession } from "../../../lib/queries";
import { FocoClient } from "./foco-client";

export default async function FocoPage() {
  const session = await requireStaffSession();
  const tasks = await getAssignedTasks(session.actorId);

  return <FocoClient tasks={tasks} />;
}
