"use client";

import * as React from "react";
import { Button } from "@hebron/ui";
import { Input } from "@hebron/ui";
import { FormField } from "@hebron/ui";
import {
  signInWithPassword,
  signInWithMagicLink,
  getSupabaseBrowserClient,
  getAssuranceLevel,
  createTotpChallenge,
  verifyTotpChallenge,
} from "@hebron/auth";
import { TotpCodeInput } from "../../../../components/totp-code-input";

// ——————————————————————————————————————————
// Types
// ——————————————————————————————————————————

type AuthMode = "password" | "magic_link";
type FormStep = "credentials" | "mfa" | "magic_link_sent";

interface FormState {
  email: string;
  password: string;
  totpCode: string;
  error: string | null;
  step: FormStep;
  loading: boolean;
  mfaChallengeId: string | null;
  mfaFactorId: string | null;
}

const initialState: FormState = {
  email: "",
  password: "",
  totpCode: "",
  error: null,
  step: "credentials",
  loading: false,
  mfaChallengeId: null,
  mfaFactorId: null,
};

// ——————————————————————————————————————————
// Error messages
// ——————————————————————————————————————————

function getErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de acessar.";
    case "user_not_found":
      return "Nenhuma conta encontrada com esse e-mail.";
    case "over_email_send_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    default:
      return "Ocorreu um erro. Tente novamente.";
  }
}

// ——————————————————————————————————————————
// LoginForm
// ——————————————————————————————————————————

interface LoginFormProps {
  returnTo: string | null;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const [mode, setMode] = React.useState<AuthMode>("password");
  const [state, setState] = React.useState<FormState>(initialState);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value, error: null }));
  }

  // ——————————————————————————————————————————
  // Password sign-in
  // ——————————————————————————————————————————

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state.email.trim() || !state.password) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { error } = await signInWithPassword(
      state.email.trim(),
      state.password,
    );

    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error.code),
      }));
      return;
    }

    // Check if MFA step-up is required
    const supabase = getSupabaseBrowserClient();
    const { currentLevel, nextLevel } = await getAssuranceLevel(supabase);

    if (nextLevel === "aal2" && currentLevel !== "aal2") {
      const {
        challengeId,
        factorId,
        error: challengeError,
      } = await createTotpChallenge(supabase);

      if (challengeError || !challengeId || !factorId) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Erro ao iniciar verificação MFA. Tente novamente.",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        step: "mfa",
        mfaChallengeId: challengeId,
        mfaFactorId: factorId,
      }));
      return;
    }

    redirectAfterLogin();
  }

  // ——————————————————————————————————————————
  // Magic link
  // ——————————————————————————————————————————

  async function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state.email.trim()) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const next = returnTo ? decodeURIComponent(returnTo) : "/";
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await signInWithMagicLink(state.email.trim(), redirectTo);

    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error.code),
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: false, step: "magic_link_sent" }));
  }

  // ——————————————————————————————————————————
  // MFA verification
  // ——————————————————————————————————————————

  async function handleMfaSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const code = state.totpCode.replace(/\s/g, "");
    if (code.length !== 6 || !state.mfaFactorId || !state.mfaChallengeId)
      return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const supabase = getSupabaseBrowserClient();
    const { error } = await verifyTotpChallenge(
      supabase,
      state.mfaFactorId,
      state.mfaChallengeId,
      code,
    );

    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        totpCode: "",
        error:
          "Código inválido ou expirado. Verifique seu aplicativo autenticador.",
      }));
      return;
    }

    redirectAfterLogin();
  }

  function redirectAfterLogin() {
    // Every login path funnels through /post-login, which enforces the
    // onboarding-approval and MFA-enrollment gates in one place instead of
    // duplicating both checks here (see app/(auth)/post-login/page.tsx).
    const destination = returnTo ? decodeURIComponent(returnTo) : "/";
    window.location.replace(
      `/post-login?return_to=${encodeURIComponent(destination)}`,
    );
  }

  // ——————————————————————————————————————————
  // Render
  // ——————————————————————————————————————————

  if (state.step === "magic_link_sent") {
    return <MagicLinkSentState email={state.email} />;
  }

  if (state.step === "mfa") {
    return (
      <MfaStep
        totpCode={state.totpCode}
        error={state.error}
        loading={state.loading}
        onChange={(v) => setField("totpCode", v)}
        onSubmit={handleMfaSubmit}
        onBack={() => setState(initialState)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode tabs */}
      <div
        className="flex rounded-(--radius) border border-(--color-border) p-1"
        style={{ background: "var(--color-muted)" }}
      >
        <ModeTab
          active={mode === "password"}
          onClick={() => {
            setMode("password");
            setState(initialState);
          }}
        >
          Senha
        </ModeTab>
        <ModeTab
          active={mode === "magic_link"}
          onClick={() => {
            setMode("magic_link");
            setState(initialState);
          }}
        >
          Link mágico
        </ModeTab>
      </div>

      {/* Password form */}
      {mode === "password" ? (
        <form
          onSubmit={handlePasswordSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormField id="email" label="E-mail" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seuemail@exemplo.com"
              value={state.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={state.loading}
            />
          </FormField>

          <FormField id="password" label="Senha" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={state.password}
              onChange={(e) => setField("password", e.target.value)}
              disabled={state.loading}
            />
          </FormField>

          {state.error && <ErrorMessage>{state.error}</ErrorMessage>}

          <Button
            type="submit"
            size="lg"
            loading={state.loading}
            disabled={!state.email.trim() || !state.password}
            className="mt-2 w-full"
          >
            Entrar
          </Button>
        </form>
      ) : (
        /* Magic link form */
        <form
          onSubmit={handleMagicLinkSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormField
            id="email-magic"
            label="E-mail"
            required
            hint="Enviaremos um link de acesso para este endereço."
          >
            <Input
              id="email-magic"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seuemail@exemplo.com"
              value={state.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={state.loading}
            />
          </FormField>

          {state.error && <ErrorMessage>{state.error}</ErrorMessage>}

          <Button
            type="submit"
            size="lg"
            loading={state.loading}
            disabled={!state.email.trim()}
            className="mt-2 w-full"
          >
            Enviar link de acesso
          </Button>
        </form>
      )}
    </div>
  );
}

// ——————————————————————————————————————————
// Sub-components
// ——————————————————————————————————————————

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 rounded-[calc(var(--radius)-2px)] py-1.5 text-(--text-sm) font-medium",
        "transition-all duration-(--transition-fast)",
        active
          ? "bg-(--color-background) text-(--color-primary) shadow-(--shadow-xs)"
          : "text-(--color-muted-foreground) hover:text-(--color-foreground)",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-(--radius) border border-(--color-destructive)/20 bg-(--color-destructive-muted) px-3 py-2 text-(--text-sm) text-(--color-destructive)"
    >
      {children}
    </p>
  );
}

function MfaStep({
  totpCode,
  error,
  loading,
  onChange,
  onSubmit,
  onBack,
}: {
  totpCode: string;
  error: string | null;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-(--text-base) font-semibold text-(--color-foreground)">
          Verificação em dois fatores
        </h3>
        <p className="mt-1 text-(--text-sm) text-(--color-muted-foreground)">
          Abra seu aplicativo autenticador e insira o código de 6 dígitos.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField id="totp" label="Código TOTP" required>
          <TotpCodeInput
            id="totp"
            value={totpCode}
            onChange={onChange}
            disabled={loading}
          />
        </FormField>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={totpCode.replace(/\s/g, "").length !== 6}
          className="w-full"
        >
          Verificar
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="text-center text-(--text-sm) text-(--color-muted-foreground) hover:text-(--color-foreground) transition-colors"
      >
        Voltar ao login
      </button>
    </div>
  );
}

function MagicLinkSentState({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      {/* Checkmark */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--color-support-green-muted)" }}
        aria-hidden="true"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-support-green)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div>
        <p className="font-medium text-(--color-foreground)">Link enviado</p>
        <p className="mt-1 text-(--text-sm) text-(--color-muted-foreground)">
          Verifique sua caixa de entrada em{" "}
          <span className="font-medium text-(--color-foreground)">{email}</span>
          . O link expira em 60 minutos.
        </p>
      </div>

      <p className="text-(--text-xs) text-(--color-muted-foreground)">
        Não recebeu? Verifique a pasta de spam.
      </p>
    </div>
  );
}
