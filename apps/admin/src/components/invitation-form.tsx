"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormField, Input } from "@hebron/ui";
import {
  createInvitationExtendedSchema,
  type CreateInvitationExtendedInput,
} from "@hebron/validators";
import { ROLES } from "@hebron/types/roles";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  diretor: "Diretor",
  conselheiro: "Conselheiro",
  colaborador: "Colaborador",
  submissor: "Submissor",
  aluno: "Aluno",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvitationFormProps {
  onSubmit: (data: CreateInvitationExtendedInput) => void | Promise<void>;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvitationForm({ onSubmit, isLoading }: InvitationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationExtendedInput>({
    resolver: zodResolver(createInvitationExtendedSchema),
    defaultValues: {
      email: "",
      roles: [],
      message: "",
      expiresInDays: 7 as number,
    },
  });

  const watchedRoles = watch("roles") ?? [];
  const loading = isLoading ?? isSubmitting;

  function toggleRole(role: string) {
    const current = watch("roles") ?? [];
    const next = current.includes(role as never)
      ? current.filter((r) => r !== role)
      : ([...current, role] as CreateInvitationExtendedInput["roles"]);
    setValue("roles", next, { shouldValidate: true });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* E-mail */}
      <FormField
        id="email"
        label="E-mail do convidado"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          placeholder="convidado@exemplo.com"
          hasError={!!errors.email}
          {...register("email")}
        />
      </FormField>

      {/* Papéis */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">
          Papéis{" "}
          <span
            className="ml-0.5 text-(--color-destructive)"
            aria-hidden="true"
          >
            *
          </span>
        </legend>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROLES.map((role) => {
            const checked = watchedRoles.includes(role as never);
            return (
              <label
                key={role}
                className={[
                  "flex cursor-pointer items-center gap-2 rounded-(--radius) border px-3 py-2.5",
                  "text-sm transition-colors duration-(--transition-fast)",
                  checked
                    ? "border-(--color-primary) bg-(--color-primary)/8 text-(--color-primary)"
                    : "border-(--color-border) bg-(--color-background) text-(--color-foreground)",
                  "hover:border-(--color-primary)/50",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleRole(role)}
                />
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                    checked
                      ? "border-(--color-primary) bg-(--color-primary)"
                      : "border-(--color-border)",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {checked && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 12 12"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                {ROLE_LABELS[role] ?? role}
              </label>
            );
          })}
        </div>

        {errors.roles && (
          <p role="alert" className="text-xs">
            {errors.roles.message ??
              (errors.roles as { root?: { message?: string } }).root?.message}
          </p>
        )}
      </fieldset>

      {/* Validade */}
      <FormField
        id="expiresInDays"
        label="Validade do convite"
        hint="Entre 1 e 30 dias"
        error={errors.expiresInDays?.message}
      >
        <Input
          id="expiresInDays"
          type="number"
          min={1}
          max={30}
          hasError={!!errors.expiresInDays}
          {...register("expiresInDays", { valueAsNumber: true })}
        />
      </FormField>

      {/* Mensagem personalizada */}
      <FormField
        id="message"
        label="Mensagem personalizada"
        hint="Opcional — será incluída no e-mail de convite"
        error={errors.message?.message}
      >
        <textarea
          id="message"
          rows={3}
          placeholder="Olá! Você foi convidado para fazer parte da plataforma Hebron Aseec."
          className={[
            "flex w-full resize-none",
            "rounded-(--radius) border border-(--color-border)",
            "bg-(--color-input-bg) text-(--color-foreground)",
            "px-3 py-2 text-sm",
            "placeholder:text-(--color-muted-foreground)",
            "transition-colors duration-(--transition-fast)",
            "hover:border-(--color-primary)/50",
            "focus-visible:outline-none focus-visible:border-(--color-primary)",
            "focus-visible:ring-2 focus-visible:ring-(--color-ring)/20",
            errors.message
              ? "border-(--color-destructive) focus-visible:ring-(--color-destructive)/20"
              : "",
          ].join(" ")}
          {...register("message")}
        />
      </FormField>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 border-t border-(--color-border) pt-4">
        <Button type="submit" loading={loading}>
          Enviar convite
        </Button>
      </div>
    </form>
  );
}
