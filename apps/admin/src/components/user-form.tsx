"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { Button, FormField, Input } from "@hebron/ui";
import {
  createUserExtendedSchema,
  updateUserExtendedSchema,
  type CreateUserExtendedInput,
  type UpdateUserExtendedInput,
} from "@hebron/validators";
import type { User } from "@hebron/types/admin";
import { ROLES, SCOPES } from "@hebron/types/roles";

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

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  admin: "Administração",
  projetos: "Projetos",
  plataforma: "Plataforma",
  radio: "Rádio",
  financeiro: "Financeiro",
  intranet: "Intranet",
  documentos: "Documentos",
  flats: "Flats",
  tarefas: "Tarefas",
};

const GOVERNANCE_ROLES = new Set(["diretor", "conselheiro"]);
const RESTRICTED_ROLES = new Set(["submissor", "hospede"]);

// ─── Shared sub-components ────────────────────────────────────────────────────

function RoleCheckboxes({
  selected,
  onToggle,
  error,
}: {
  selected: string[];
  onToggle: (role: string) => void;
  error?: string;
}) {
  const hasConflict =
    selected.some((r) => GOVERNANCE_ROLES.has(r)) &&
    selected.some((r) => RESTRICTED_ROLES.has(r));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-[--text-sm] font-medium">
        Papéis{" "}
        <span className="ml-0.5 text-[--color-destructive]" aria-hidden="true">
          *
        </span>
      </legend>

      {hasConflict && (
        <div className="flex items-start gap-2 rounded-[--radius] border border-amber-400/40 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[--text-sm]">
            Conflito de interesse: diretores e conselheiros não devem acumular
            os papéis de submissor ou hóspede.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROLES.map((role) => {
          const checked = selected.includes(role);
          return (
            <label
              key={role}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-[--radius] border px-3 py-2.5",
                "text-[--text-sm] transition-colors duration-[--transition-fast]",
                checked
                  ? "border-[--color-primary] bg-[--color-primary]/8 text-[--color-primary]"
                  : "border-[--color-border] bg-[--color-background] text-[--color-foreground]",
                "hover:border-[--color-primary]/50",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onToggle(role)}
              />
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                  checked
                    ? "border-[--color-primary] bg-[--color-primary]"
                    : "border-[--color-border]",
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

      {error && (
        <p role="alert" className="text-[--text-xs]">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function ModuleAccessCheckboxes({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (scope: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-[--text-sm] font-medium">
        Suspensão granular por módulo
      </legend>
      <p className="text-[--text-xs]">
        Marque os módulos que este usuário <strong>não</strong> pode acessar.
        Vazio = acesso total.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {SCOPES.filter((s) => s !== "global").map((scope) => {
          const blocked = selected.includes(scope);
          return (
            <label
              key={scope}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-[--radius] border px-2.5 py-2",
                "text-[--text-xs] transition-colors duration-[--transition-fast]",
                blocked
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-[--color-border] bg-[--color-background] text-[--color-foreground]",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={blocked}
                onChange={() => onToggle(scope)}
              />
              <span
                className={[
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                  blocked
                    ? "border-red-500 bg-red-500"
                    : "border-[--color-border]",
                ].join(" ")}
                aria-hidden="true"
              >
                {blocked && (
                  <svg
                    className="h-2.5 w-2.5 text-white"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </span>
              {SCOPE_LABELS[scope] ?? scope}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── UserCreateForm ───────────────────────────────────────────────────────────

interface UserCreateFormProps {
  onSubmit: (data: CreateUserExtendedInput) => void | Promise<void>;
  isLoading?: boolean;
}

export function UserCreateForm({ onSubmit, isLoading }: UserCreateFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserExtendedInput>({
    resolver: zodResolver(createUserExtendedSchema),
    defaultValues: {
      name: "",
      email: "",
      roles: [],
      moduleAccess: [],
      sendInvite: true,
    },
  });

  const loading = isLoading ?? isSubmitting;
  const selectedRoles = watch("roles") ?? [];
  const selectedModules = watch("moduleAccess") ?? [];
  const sendInvite = watch("sendInvite");

  function toggleRole(role: string) {
    const next = selectedRoles.includes(role as never)
      ? selectedRoles.filter((r) => r !== role)
      : ([...selectedRoles, role] as CreateUserExtendedInput["roles"]);
    setValue("roles", next, { shouldValidate: true });
  }

  function toggleModule(scope: string) {
    const next = selectedModules.includes(scope as never)
      ? selectedModules.filter((s) => s !== scope)
      : ([...selectedModules, scope] as NonNullable<
          CreateUserExtendedInput["moduleAccess"]
        >);
    setValue("moduleAccess", next, { shouldValidate: true });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <FormField
        id="name"
        label="Nome completo"
        required
        error={errors.name?.message}
      >
        <Input
          id="name"
          type="text"
          placeholder="Nome do usuário"
          hasError={!!errors.name}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="email"
        label="E-mail"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          placeholder="usuario@hebronaseec.com.br"
          hasError={!!errors.email}
          {...register("email")}
        />
      </FormField>

      <RoleCheckboxes
        selected={selectedRoles}
        onToggle={toggleRole}
        error={
          errors.roles?.message ??
          (errors.roles as { root?: { message?: string } } | undefined)?.root
            ?.message
        }
      />

      <ModuleAccessCheckboxes
        selected={selectedModules}
        onToggle={toggleModule}
      />

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="sr-only"
          {...register("sendInvite")}
        />
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded border",
            sendInvite
              ? "border-[--color-primary] bg-[--color-primary]"
              : "border-[--color-border] bg-[--color-background]",
          ].join(" ")}
          aria-hidden="true"
        >
          {sendInvite && (
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 12 12"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </span>
        <span className="text-[--text-sm]">Enviar convite por e-mail</span>
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-[--color-border] pt-4">
        <Button type="submit" loading={loading}>
          Criar usuário
        </Button>
      </div>
    </form>
  );
}

// ─── UserEditForm ─────────────────────────────────────────────────────────────

interface UserEditFormProps {
  user: User;
  currentRoles: string[];
  onSubmit: (data: UpdateUserExtendedInput) => void | Promise<void>;
  isLoading?: boolean;
}

export function UserEditForm({
  user,
  currentRoles,
  onSubmit,
  isLoading,
}: UserEditFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserExtendedInput>({
    resolver: zodResolver(updateUserExtendedSchema),
    defaultValues: {
      id: user.id,
      name: user.name,
      status: user.status as "active" | "suspended" | "pending_approval",
      roles: currentRoles as UpdateUserExtendedInput["roles"],
      moduleAccess:
        user.moduleAccess as UpdateUserExtendedInput["moduleAccess"],
    },
  });

  const loading = isLoading ?? isSubmitting;
  const selectedRoles = watch("roles") ?? [];
  const selectedModules = watch("moduleAccess") ?? [];
  const currentStatus = watch("status");

  function toggleRole(role: string) {
    const next = selectedRoles.includes(role as never)
      ? selectedRoles.filter((r) => r !== role)
      : ([...selectedRoles, role] as NonNullable<
          UpdateUserExtendedInput["roles"]
        >);
    setValue("roles", next, { shouldValidate: true });
  }

  function toggleModule(scope: string) {
    const next = selectedModules.includes(scope as never)
      ? selectedModules.filter((s) => s !== scope)
      : ([...selectedModules, scope] as NonNullable<
          UpdateUserExtendedInput["moduleAccess"]
        >);
    setValue("moduleAccess", next, { shouldValidate: true });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <input type="hidden" {...register("id")} />

      <FormField
        id="name"
        label="Nome completo"
        required
        error={errors.name?.message}
      >
        <Input
          id="name"
          type="text"
          placeholder="Nome do usuário"
          hasError={!!errors.name}
          {...register("name")}
        />
      </FormField>

      <RoleCheckboxes
        selected={selectedRoles}
        onToggle={toggleRole}
        error={
          errors.roles?.message ??
          (errors.roles as { root?: { message?: string } } | undefined)?.root
            ?.message
        }
      />

      <ModuleAccessCheckboxes
        selected={selectedModules}
        onToggle={toggleModule}
      />

      <FormField id="status" label="Status" error={errors.status?.message}>
        <div className="flex flex-wrap gap-2">
          {(["active", "suspended", "pending_approval"] as const).map((s) => {
            const labels = {
              active: "Ativo",
              suspended: "Suspenso",
              pending_approval: "Aguardando aprovação",
            };
            return (
              <label
                key={s}
                className={[
                  "flex cursor-pointer items-center gap-2 rounded-[--radius] border px-3 py-2",
                  "text-[--text-sm] transition-colors duration-[--transition-fast]",
                  currentStatus === s
                    ? "border-[--color-primary] bg-[--color-primary]/8 text-[--color-primary]"
                    : "border-[--color-border] text-[--color-foreground]",
                ].join(" ")}
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={s}
                  {...register("status")}
                />
                {labels[s]}
              </label>
            );
          })}
        </div>
      </FormField>

      <div className="flex items-center justify-end gap-3 border-t border-[--color-border] pt-4">
        <Button type="submit" loading={loading}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
