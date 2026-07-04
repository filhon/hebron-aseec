"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MeetingForm,
  type MeetingFormDirector,
} from "../../../../components/meeting-form";
import { createMeeting } from "../../../../actions/meetings";
import type { MeetingInput } from "@hebron/validators";

interface Props {
  directors: MeetingFormDirector[];
}

export function NovaReuniaoClient({ directors }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: MeetingInput) {
    setError(null);
    setLoading(true);
    try {
      const result = await createMeeting(data);
      if (result?.serverError) {
        setError(result.serverError);
        return;
      }
      router.push("/reunioes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hb-page" style={{ maxWidth: 640 }}>
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Diretoria · nova convocação</div>
          <h1 className="hb-page-title">Nova reunião</h1>
        </div>
      </div>

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

      <div className="hb-card" style={{ padding: 24 }}>
        <MeetingForm
          directors={directors}
          onSubmit={handleSubmit}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
