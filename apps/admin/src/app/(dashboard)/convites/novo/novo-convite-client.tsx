"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InvitationForm } from "../../../../components/invitation-form";
import { sendInvitation } from "../../../../actions/invitations";
import type { CreateInvitationExtendedInput } from "@hebron/validators";

export function NovoConviteClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: CreateInvitationExtendedInput) {
    setError(null);
    setLoading(true);
    try {
      const result = await sendInvitation(data);
      if (result?.serverError) {
        setError(result.serverError);
        return;
      }
      router.push("/convites?success=enviado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hb-page" style={{ maxWidth: 640 }}>
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Aprovação · entrada no ecossistema</div>
          <h1 className="hb-page-title">Novo convite</h1>
          <p className="hb-page-subtitle">
            O convite expira no prazo escolhido e pode ser reenviado ou revogado
            a qualquer momento.
          </p>
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
        <InvitationForm onSubmit={handleSubmit} isLoading={loading} />
      </div>
    </div>
  );
}
