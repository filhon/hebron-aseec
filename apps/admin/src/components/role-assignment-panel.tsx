"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RoleAssignmentForm,
  type RoleAssignmentFormUser,
  type RoleAssignmentFormAssignment,
} from "./role-assignment-form";
import { assignRole, revokeRole } from "../actions/roles";
import type { RoleAssignmentInput } from "@hebron/validators";

interface Props {
  users: RoleAssignmentFormUser[];
  assignments: RoleAssignmentFormAssignment[];
  defaultUserId?: string;
}

export function RoleAssignmentPanel({
  users,
  assignments,
  defaultUserId,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(data: RoleAssignmentInput) {
    setError(null);
    const result = await assignRole(data);
    if (result?.serverError) {
      setError(result.serverError);
      return;
    }
    router.refresh();
  }

  async function handleRevoke(assignmentId: string) {
    setError(null);
    const result = await revokeRole({ assignmentId });
    if (result?.serverError) {
      setError(result.serverError);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div
          style={{
            background: "rgba(184,51,26,0.08)",
            border: "1px solid rgba(184,51,26,0.3)",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 13.5,
            color: "var(--hb-red)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      <RoleAssignmentForm
        users={users}
        assignments={assignments}
        onAssign={handleAssign}
        onRevoke={handleRevoke}
        defaultUserId={defaultUserId}
      />
    </div>
  );
}
