"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DesignationForm,
  type DesignationFormUser,
  type DesignationFormDesignation,
} from "./designation-form";
import { updateDesignation } from "../actions/roles";
import type { DesignationInput } from "@hebron/validators";

interface Props {
  directors: DesignationFormUser[];
  designations: DesignationFormDesignation[];
}

export function DesignationPanel({ directors, designations }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(data: DesignationInput) {
    setError(null);
    const result = await updateDesignation({
      userId: data.userId,
      type: data.type,
      action: "assign",
    });
    if (result?.serverError) {
      setError(result.serverError);
      return;
    }
    router.refresh();
  }

  async function handleRevoke(designationId: string) {
    setError(null);
    const target = designations.find((d) => d.id === designationId);
    if (!target) return;
    const result = await updateDesignation({
      userId: target.userId,
      type: target.type,
      action: "revoke",
    });
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
      <DesignationForm
        directors={directors}
        designations={designations}
        onAssign={handleAssign}
        onRevoke={handleRevoke}
      />
    </div>
  );
}
