"use client";

import * as React from "react";
import type { z } from "zod";
import { User, X } from "lucide-react";
import { createAuthorSchema } from "@hebron/validators/radio";
import type { Author } from "@hebron/types/radio";
import { Button, FormField, Input } from "@hebron/ui";

const PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

export interface AuthorFormValues {
  name: string;
  bio: string | null;
  /** Novo arquivo selecionado — `null` mantém `existingPhotoUrl` (modo edição). */
  photoFile: File | null;
  existingPhotoUrl: string | null;
}

export interface AuthorFormProps {
  author?: Author;
  onSubmit: (values: AuthorFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar autor (nome, bio, foto). */
export function AuthorForm({
  author,
  onSubmit,
  isLoading = false,
  className,
}: AuthorFormProps) {
  const [name, setName] = React.useState(author?.name ?? "");
  const [bio, setBio] = React.useState(author?.bio ?? "");
  const [existingPhotoUrl] = React.useState<string | null>(
    author?.photoUrl ?? null,
  );
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    author?.photoUrl ?? null,
  );
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const localPreviewRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!(PHOTO_ALLOWED_MIME_TYPES as string[]).includes(file.type)) {
      setPhotoError("Formato não suportado. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > PHOTO_MAX_SIZE_BYTES) {
      setPhotoError("Imagem muito grande. Tamanho máximo: 5 MB.");
      return;
    }

    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    const previewUrl = URL.createObjectURL(file);
    localPreviewRef.current = previewUrl;
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setPhotoError(null);
  }

  function removePhoto() {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createAuthorSchema
      .omit({ photoUrl: true })
      .safeParse({ name, bio: bio.trim() || null });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit({
      name: result.data.name,
      bio: result.data.bio,
      photoFile,
      existingPhotoUrl,
    });
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
          placeholder="Ex.: Pr. João Silva"
        />
      </FormField>

      <FormField
        label="Foto"
        hint="JPEG, PNG ou WebP, até 5 MB."
        error={photoError ?? undefined}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--surface-alt)">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-(--fg-subtle)" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? "Trocar foto" : "Selecionar foto"}
            </Button>
            {photoPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={removePhoto}
              >
                Remover
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
            aria-label="Selecionar foto do autor"
          />
        </div>
      </FormField>

      <FormField
        label="Bio"
        error={errors.bio}
        hint="Breve apresentação do autor, exibida na página pública."
      >
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
          placeholder="Opcional"
        />
      </FormField>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {author ? "Salvar alterações" : "Criar autor"}
      </Button>
    </form>
  );
}
