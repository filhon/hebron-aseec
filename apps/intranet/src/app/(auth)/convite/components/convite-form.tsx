"use client";

import * as React from "react";
import { Button, Input, FormField } from "@hebron/ui";
import { signInWithPassword } from "@hebron/auth";
import { acceptInvitation } from "../../../../actions/invitations";

interface ConviteFormProps {
  token: string;
  email: string;
}

interface FormState {
  name: string;
  password: string;
  confirmPassword: string;
  error: string | null;
  loading: boolean;
}

const initialState: FormState = {
  name: "",
  password: "",
  confirmPassword: "",
  error: null,
  loading: false,
};

export function ConviteForm({ token, email }: ConviteFormProps) {
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

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const result = await acceptInvitation({
      token,
      name: state.name.trim(),
      password: state.password,
    });

    if (result?.serverError || result?.validationErrors) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: result.serverError ?? "Dados inválidos. Revise o formulário.",
      }));
      return;
    }

    // A conta acabou de ser criada com essa senha — login imediato para não
    // pedir de novo o que a pessoa já digitou.
    const { error } = await signInWithPassword(email, state.password);
    if (error) {
      window.location.replace("/login");
      return;
    }

    window.location.replace(`/post-login?return_to=${encodeURIComponent("/")}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="name" label="Nome completo" required>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          autoFocus
          placeholder="Seu nome completo"
          value={state.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={state.loading}
        />
      </FormField>

      <FormField id="password" label="Crie uma senha" required>
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
          !state.name.trim() || !state.password || !state.confirmPassword
        }
        className="mt-2 w-full"
      >
        Criar conta e entrar
      </Button>
    </form>
  );
}
