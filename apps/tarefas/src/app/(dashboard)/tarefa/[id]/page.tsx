import { notFound } from "next/navigation";
import {
  getApprovers,
  getAssignableUsers,
  getTaskById,
  getTags,
  requireStaffSession,
} from "../../../../lib/queries";
import { TaskDetailClient } from "./task-detail-client";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, task, assignableUsers, approvers, tags] = await Promise.all([
    requireStaffSession(),
    getTaskById(id),
    getAssignableUsers(),
    getApprovers(),
    getTags(),
  ]);

  if (!task) notFound();

  return (
    <TaskDetailClient
      initialTask={task}
      currentUserId={session.actorId}
      isApprover={session.roles.some(
        (r) => r === "diretor" || r === "conselheiro" || r === "super_admin",
      )}
      isSuperAdmin={session.roles.includes("super_admin")}
      assignableUsers={assignableUsers}
      approvers={approvers}
      tags={tags}
    />
  );
}
