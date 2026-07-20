"use client";

import * as React from "react";
import { Button, FormField } from "@hebron/ui";
import {
  getSupabaseBrowserClient,
  enrollTotp,
  verifytotpEnrollment,
} from "@hebron/auth";
import { TotpCodeInput } from "../../../../../components/totp-code-input";
import { confirmMfaEnrollment } from "../../../../../actions/mfa";

interface MfaEnrollFormProps {
  returnTo: string;
}

type Step = "loading" | "ready" | "error";

export function MfaEnrollForm({ returnTo }: MfaEnrollFormProps) {
  const [step, setStep] = React.useState<Step>("loading");
  const [qrCode, setQrCode] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [factorId, setFactorId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function startEnrollment() {
      const supabase = getSupabaseBrowserClient();
      const result = await enrollTotp(supabase, "Autenticador");
      if (cancelled) return;

      if (result.error || !result.factorId) {
        setStep("error");
        return;
      }

      setQrCode(result.qrCode);
      setSecret(result.secret);
      setFactorId(result.factorId);
      setStep("ready");
    }

    void startEnrollment();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = code.replace(/\s/g, "");
    if (clean.length !== 6) return;

    setVerifying(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await verifytotpEnrollment(
      supabase,
      factorId,
      clean,
    );

    if (verifyError) {
      setVerifying(false);
      setCode("");
      setError(
        "Código inválido ou expirado. Verifique seu aplicativo autenticador.",
      );
      return;
    }

    await confirmMfaEnrollment({});
    window.location.replace(
      `/post-login?return_to=${encodeURIComponent(returnTo)}`,
    );
  }

  if (step === "loading") {
    return (
      <p className="py-8 text-center text-sm text-(--fg-muted)">
        Preparando o código de ativação…
      </p>
    );
  }

  if (step === "error") {
    return (
      <p
        role="alert"
        className="rounded-(--radius) border border-(--color-destructive)/20 bg-(--color-destructive-muted) px-3 py-2 text-sm text-(--color-destructive)"
      >
        Não foi possível gerar o código de ativação. Recarregue a página ou
        contate o suporte.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-(--fg-muted)">
          Escaneie o código com um aplicativo autenticador (Google
          Authenticator, Authy, 1Password).
        </p>
        {qrCode && (
          <img
            src={qrCode}
            alt="QR code para ativação da verificação em duas etapas"
            width={180}
            height={180}
            className="rounded-(--radius) border border-(--border) p-2"
          />
        )}
        <details className="w-full text-center">
          <summary className="cursor-pointer text-xs text-(--fg-muted)">
            Não consegue escanear? Insira manualmente
          </summary>
          <code className="mt-2 block break-all rounded-(--radius) bg-(--surface-alt) px-3 py-2 text-xs">
            {secret}
          </code>
        </details>
      </div>

      <form onSubmit={handleVerify} noValidate className="flex flex-col gap-4">
        <FormField id="mfa-enroll-code" label="Código do aplicativo" required>
          <TotpCodeInput
            id="mfa-enroll-code"
            value={code}
            onChange={setCode}
            disabled={verifying}
          />
        </FormField>

        {error && (
          <p
            role="alert"
            className="rounded-(--radius) border border-(--color-destructive)/20 bg-(--color-destructive-muted) px-3 py-2 text-sm text-(--color-destructive)"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          loading={verifying}
          disabled={code.replace(/\s/g, "").length !== 6}
          className="w-full"
        >
          Ativar
        </Button>
      </form>
    </div>
  );
}
