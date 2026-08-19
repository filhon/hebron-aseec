"use client";

import * as React from "react";
import type { z } from "zod";
import type { Series } from "@hebron/types/plataforma";
import { seriesSchema } from "@hebron/validators";
import { FormField, Input, Button } from "@hebron/ui";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export interface SeriesFormValues {
  name: string;
  slug: string;
  description: string | null;
}

export interface SeriesFormProps {
  mode?: "create" | "edit";
  series?: Series;
  onSubmit: (values: SeriesFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar série (coleção temática de cursos, PATCH-024). Precedente:
 * instructor-form.tsx (P-6.13). */
export function SeriesForm({
  mode = "create",
  series,
  onSubmit,
  isLoading = false,
  className,
}: SeriesFormProps) {
  const [name, setName] = React.useState(series?.name ?? "");
  const [slug, setSlug] = React.useState(series?.slug ?? "");
  const [description, setDescription] = React.useState(
    series?.description ?? "",
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = seriesSchema.safeParse({
      name,
      slug,
      description: description.trim() || null,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={className ? className : "space-y-5"}
    >
      <FormField label="Nome" error={errors.name} required>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSlug(slugify(e.target.value));
          }}
          placeholder="Ex.: Fundamentos da Fé"
        />
      </FormField>

      <FormField
        label="Slug"
        hint="Usado no filtro de série do catálogo. Gerado automaticamente a partir do nome."
        error={errors.slug}
        required
      >
        <Input
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </FormField>

      <FormField
        label="Descrição"
        hint="Texto curto exibido no filtro do catálogo. Opcional."
        error={errors.description}
      >
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
          placeholder="Opcional"
        />
      </FormField>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {mode === "edit" ? "Salvar alterações" : "Criar série"}
      </Button>
    </form>
  );
}
