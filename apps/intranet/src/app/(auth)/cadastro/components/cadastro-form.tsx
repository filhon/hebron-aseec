"use client";

import * as React from "react";
import { Button, Input, FormField } from "@hebron/ui";
import { signUpWithPassword } from "@hebron/auth";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
  error: string | null;
  loading: boolean;
  sent: boolean;
}

const initialState: FormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  consent: false,
  error: null,
  loading: false,
  sent: false,
};

export function CadastroForm() {
  const [state, setState] = React.useState<FormState>(initialState);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value, error: null }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (state.password.length < 8) {
      setState((prev) => ({
        ...prev,
        error: "A senha deve ter pelo menos 8 caracteres.",
      }));
      return;
    }
    if (state.password !== state.confirmPassword) {
      setState((prev) => ({ ...prev, error: "As senhas não coincidem." }));
      return;
    }
    if (!state.consent) {
      setState((prev) => ({
        ...prev,
        error: "É necessário autorizar o uso dos dados para prosseguir.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const next = encodeURIComponent("/cadastro/instituicao");
    const emailRedirectTo = `${baseUrl}/auth/callback?next=${next}`;

    const { error } = await signUpWithPassword(
      state.email.trim(),
      state.password,
      state.fullName.trim(),
      emailRedirectTo,
    );

    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getSignupErrorMessage(error.code),
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: false, sent: true }));
  }

  if (state.sent) {
    return <ConfirmationSentState email={state.email} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="fullName" label="Nome completo" required>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          autoFocus
          placeholder="Seu nome completo"
          value={state.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          disabled={state.loading}
        />
      </FormField>

      <FormField id="email" label="E-mail" required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
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
          autoComplete="new-password"
          placeholder="••••••••"
          value={state.password}
          onChange={(e) => setField("password", e.target.value)}
          disabled={state.loading}
        />
      </FormField>

      <FormField id="confirm-password" label="Confirme a senha" required>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={state.confirmPassword}
          onChange={(e) => setField("confirmPassword", e.target.value)}
          disabled={state.loading}
        />
      </FormField>

      <label className="flex items-start gap-2 text-(--text-xs) text-(--color-muted-foreground)">
        <input
          type="checkbox"
          checked={state.consent}
          onChange={(e) => setField("consent", e.target.checked)}
          disabled={state.loading}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-(--radius-sm) border-(--color-border) text-(--color-primary)"
        />
        <span>
          Autorizo o uso dos meus dados para fins de análise e aprovação de
          cadastro, conforme a Lei Geral de Proteção de Dados.
        </span>
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-(--radius) border border-(--color-destructive)/20 bg-(--color-destructive-muted) px-3 py-2 text-(--text-sm) text-(--color-destructive)"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={state.loading}
        disabled={
          !state.fullName.trim() ||
          !state.email.trim() ||
          !state.password ||
          !state.confirmPassword
        }
        className="mt-2 w-full"
      >
        Solicitar acesso
      </Button>

      <p className="text-center text-(--text-xs) text-(--color-muted-foreground)">
        Já tem uma conta?{" "}
        <a
          href="/login"
          className="text-(--color-primary) underline-offset-2 hover:underline"
        >
          Fazer login
        </a>
      </p>
    </form>
  );
}

function getSignupErrorMessage(code: string | undefined): string {
  switch (code) {
    case "user_already_exists":
      return "Já existe uma conta com este e-mail. Tente fazer login.";
    case "weak_password":
      return "Escolha uma senha mais forte.";
    case "over_email_send_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    default:
      return "Não foi possível concluir o cadastro. Tente novamente.";
  }
}

function ConfirmationSentState({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
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
        <p className="font-medium text-(--color-foreground)">
          Confirme seu e-mail
        </p>
        <p className="mt-1 text-(--text-sm) text-(--color-muted-foreground)">
          Enviamos um link de confirmação para{" "}
          <span className="font-medium text-(--color-foreground)">{email}</span>
          . Depois de confirmar, você vai vincular sua instituição para concluir
          o cadastro.
        </p>
      </div>
    </div>
  );
}
