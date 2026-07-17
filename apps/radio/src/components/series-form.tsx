"use client";

import * as React from "react";
import type { z } from "zod";
import { createSeriesSchema } from "@hebron/validators/radio";
import type { Author, Series } from "@hebron/types/radio";
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
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
  authorId: string;
  description: string | null;
}

export interface SeriesFormProps {
  authors: Author[];
  series?: Series;
  onSubmit: (values: SeriesFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar série (nome, autor, descrição). */
export function SeriesForm({
  authors,
  series,
  onSubmit,
  isLoading = false,
  className,
}: SeriesFormProps) {
  const [name, setName] = React.useState(series?.name ?? "");
  const [authorId, setAuthorId] = React.useState(
    series?.authorId ?? authors[0]?.id ?? "",
  );
  const [description, setDescription] = React.useState(
    series?.description ?? "",
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createSeriesSchema.safeParse({
      name,
      authorId,
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
      className={cn("space-y-5", className)}
    >
      <FormField label="Nome" error={errors.name} required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Romanos"
        />
      </FormField>

      <FormField label="Autor" error={errors.authorId} required>
        <Select value={authorId} onValueChange={setAuthorId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um autor" />
          </SelectTrigger>
          <SelectContent>
            {authors.map((author) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Descrição"
        error={errors.description}
        hint="Explique o tema da série."
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
          placeholder="Opcional"
        />
      </FormField>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {series ? "Salvar alterações" : "Criar série"}
      </Button>
    </form>
  );
}
