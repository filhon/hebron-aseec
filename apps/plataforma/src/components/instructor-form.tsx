"use client";

import * as React from "react";
import type { z } from "zod";
import type { Instructor } from "@hebron/types/plataforma";
import { createInstructorSchema } from "@hebron/validators";
import {
  FormField,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@hebron/ui";
import type { SelectableUser } from "../lib/queries";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export interface InstructorFormValues {
  userId: string;
  name: string;
  bio: string | null;
}

export interface InstructorFormProps {
  mode?: "create" | "edit";
  instructor?: Instructor;
  users: SelectableUser[];
  onSubmit: (values: InstructorFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar instrutor — vincula a um usuário existente (P-6.13). */
export function InstructorForm({
  mode = "create",
  instructor,
  users,
  onSubmit,
  isLoading = false,
  className,
}: InstructorFormProps) {
  const [userId, setUserId] = React.useState(instructor?.userId ?? "");
  const [name, setName] = React.useState(instructor?.name ?? "");
  const [bio, setBio] = React.useState(instructor?.bio ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleUserChange(value: string) {
    setUserId(value);
    if (!name) {
      const selected = users.find((u) => u.id === value);
      if (selected) setName(selected.fullName ?? selected.email);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) {
      setErrors({ userId: "Selecione um usuário" });
      return;
    }

    const result = createInstructorSchema.safeParse({
      userId,
      name,
      bio: bio.trim() || null,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit({
      userId,
      name: result.data.name,
      bio: result.data.bio,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={className ? className : "space-y-5"}
    >
      <FormField label="Usuário" error={errors.userId} required>
        <Select value={userId} onValueChange={handleUserChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName ?? user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Nome de exibição"
        hint="Aparece publicamente no catálogo de cursos."
        error={errors.name}
        required
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <FormField
        label="Biografia"
        hint="Texto curto exibido na página do curso. Opcional."
        error={errors.bio}
      >
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
          placeholder="Opcional"
        />
      </FormField>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {mode === "edit" ? "Salvar alterações" : "Criar instrutor"}
      </Button>
    </form>
  );
}
