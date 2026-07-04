"use client";

import * as React from "react";
import { Button, FormField } from "@hebron/ui";
import {
  getSupabaseBrowserClient,
  createTotpChallenge,
  verifyTotpChallenge,
} from "@hebron/auth";
import { TotpCodeInput } from "../../../../../components/totp-code-input";

interface MfaChallengeFormProps {
  returnTo: string;
}

export function MfaChallengeForm({ returnTo }: MfaChallengeFormProps) {
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function startChallenge() {
      const supabase = getSupabaseBrowserClient();
      const result = await createTotpChallenge(supabase);
      if (cancelled) return;

      if (result.error || !result.challengeId || !result.factorId) {
        setError(
          "Não foi possível iniciar a verificação. Recarregue a página.",
        );
        return;
      }
      setChallengeId(result.challengeId);
      setFactorId(result.factorId);
    }

    void startChallenge();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = code.replace(/\s/g, "");
    if (clean.length !== 6 || !factorId || !challengeId) return;

    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await verifyTotpChallenge(
      supabase,
      factorId,
      challengeId,
      clean,
    );

    if (verifyError) {
      setLoading(false);
      setCode("");
      setError(
        "Código inválido ou expirado. Verifique seu aplicativo autenticador.",
      );
      return;
    }

    window.location.replace(
      `/post-login?return_to=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="mfa-challenge-code" label="Código TOTP" required>
        <TotpCodeInput
          id="mfa-challenge-code"
          value={code}
          onChange={setCode}
          disabled={loading}
        />
      </FormField>

      {error && (
        <p
          role="alert"
          className="rounded-(--radius) border border-(--color-destructive)/20 bg-(--color-destructive-muted) px-3 py-2 text-(--text-sm) text-(--color-destructive)"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={loading}
        disabled={code.replace(/\s/g, "").length !== 6 || !challengeId}
        className="w-full"
      >
        Verificar
      </Button>
    </form>
  );
}
