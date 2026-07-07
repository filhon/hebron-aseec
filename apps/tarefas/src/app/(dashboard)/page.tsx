import { getAssignableUsers, getTags, getTasks } from "../../lib/queries";
import { MyTasksClient } from "./my-tasks-client";

export default async function MinhasTarefasPage() {
  const [tasks, assignableUsers, tags] = await Promise.all([
    getTasks(),
    getAssignableUsers(),
    getTags(),
  ]);

  return (
    <MyTasksClient
      tasks={tasks}
      assignableUsers={assignableUsers}
      tags={tags}
    />
  );
}
