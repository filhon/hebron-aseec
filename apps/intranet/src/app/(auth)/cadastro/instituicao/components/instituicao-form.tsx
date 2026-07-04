"use client";

import * as React from "react";
import { Building2, Search } from "lucide-react";
import { Button, Input, FormField } from "@hebron/ui";
import {
  searchOrganizationsForSignup,
  completeSignupOrganization,
} from "../../../../../actions/onboarding";

type OrgResult = { id: string; nome: string; cnpj: string | null };

export function InstituicaoForm() {
  const [mode, setMode] = React.useState<"buscar" | "nova">("buscar");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<OrgResult[]>([]);
  const [selected, setSelected] = React.useState<OrgResult | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [newNome, setNewNome] = React.useState("");
  const [newCnpj, setNewCnpj] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query.trim().length < 2) return;

    setSearching(true);
    setError(null);
    const result = await searchOrganizationsForSignup({ query: query.trim() });
    setSearching(false);

    if (result?.serverError) {
      setError(result.serverError);
      return;
    }
    setResults(result?.data?.organizations ?? []);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const result = await completeSignupOrganization(
      mode === "buscar"
        ? { existingOrganizationId: selected?.id }
        : {
            newOrganizationName: newNome.trim(),
            newOrganizationCnpj: newCnpj.trim(),
          },
    );

    if (result?.serverError || result?.validationErrors) {
      setLoading(false);
      setError(
        result.serverError ?? "Revise as informações e tente novamente.",
      );
      return;
    }

    window.location.replace("/cadastro/status");
  }

  const canConfirm =
    mode === "buscar" ? Boolean(selected) : newNome.trim().length >= 2;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex rounded-(--radius) border border-(--color-border) p-1"
        style={{ background: "var(--color-muted)" }}
      >
        <ModeTab
          active={mode === "buscar"}
          onClick={() => {
            setMode("buscar");
            setError(null);
          }}
        >
          Já existe cadastro
        </ModeTab>
        <ModeTab
          active={mode === "nova"}
          onClick={() => {
            setMode("nova");
            setError(null);
          }}
        >
          Cadastrar nova
        </ModeTab>
      </div>

      {mode === "buscar" ? (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-muted-foreground)"
              />
              <Input
                type="text"
                placeholder="Nome ou CNPJ da instituição"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                className="pl-9"
                aria-label="Buscar instituição"
              />
            </div>
            <Button type="submit" variant="outline" loading={searching}>
              Buscar
            </Button>
          </form>

          {results.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {results.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(org)}
                    className={[
                      "flex w-full items-center gap-3 rounded-(--radius) border px-3 py-2.5 text-left transition-colors",
                      selected?.id === org.id
                        ? "border-(--color-primary) bg-(--color-primary-muted)"
                        : "border-(--color-border) hover:bg-(--color-muted)",
                    ].join(" ")}
                  >
                    <Building2
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-(--color-muted-foreground)"
                    />
                    <span className="flex flex-col">
                      <span className="text-(--text-sm) font-medium text-(--color-foreground)">
                        {org.nome}
                      </span>
                      {org.cnpj && (
                        <span className="text-(--text-xs) text-(--color-muted-foreground)">
                          {org.cnpj}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {results.length === 0 && query.trim().length >= 2 && !searching && (
            <p className="text-(--text-sm) text-(--color-muted-foreground)">
              Nenhuma instituição encontrada. Você pode cadastrar uma nova.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <FormField id="new-org-nome" label="Nome da instituição" required>
            <Input
              id="new-org-nome"
              type="text"
              placeholder="Nome oficial da instituição"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
            />
          </FormField>
          <FormField id="new-org-cnpj" label="CNPJ" hint="Opcional">
            <Input
              id="new-org-cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              value={newCnpj}
              onChange={(e) => setNewCnpj(e.target.value)}
            />
          </FormField>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-(--radius) border border-(--color-destructive)/20 bg-(--color-destructive-muted) px-3 py-2 text-(--text-sm) text-(--color-destructive)"
        >
          {error}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        loading={loading}
        disabled={!canConfirm}
        onClick={handleConfirm}
        className="mt-2 w-full"
      >
        Concluir cadastro
      </Button>
    </div>
  );
}

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
