"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import {
  Button,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hebron/ui";
import {
  roleAssignmentSchema,
  type RoleAssignmentInput,
} from "@hebron/validators";
import { ROLES, SCOPES } from "@hebron/types/roles";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoleAssignmentFormUser {
  id: string;
  name: string;
}

export interface RoleAssignmentFormAssignment {
  id: string;
  userId: string;
  role: RoleAssignmentInput["role"];
  scope: RoleAssignmentInput["scope"];
  grantedAt: Date;
}

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
  global: "Global (todos os módulos)",
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoleAssignmentFormProps {
  users: RoleAssignmentFormUser[];
  assignments: RoleAssignmentFormAssignment[];
  onAssign: (data: RoleAssignmentInput) => void | Promise<void>;
  onRevoke: (assignmentId: string) => void | Promise<void>;
  isLoading?: boolean;
  /** Pré-seleciona o usuário (vindo de ?userId= na tela de perfil) */
  defaultUserId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoleAssignmentForm({
  users,
  assignments,
  onAssign,
  onRevoke,
  isLoading,
  defaultUserId,
}: RoleAssignmentFormProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleAssignmentInput>({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: {
      userId: defaultUserId ?? "",
      role: "colaborador",
      scope: "global",
    },
  });

  const loading = isLoading ?? isSubmitting;
  const watchedUserId = watch("userId");
  const watchedRole = watch("role");
  const watchedScope = watch("scope");

  async function handleAssign(data: RoleAssignmentInput) {
    await onAssign(data);
    reset();
  }

  // Toda atribuição presente já está ativa — revogar apaga a linha (hard delete).
  const activeAssignments = assignments;

  return (
    <div className="flex flex-col gap-8">
      {/* Assign form */}
      <form
        onSubmit={handleSubmit(handleAssign)}
        className="flex flex-col gap-5"
        noValidate
      >
        <h3 className="text-sm font-semibold">Atribuir papel</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Usuário */}
          <FormField
            id="userId"
            label="Usuário"
            required
            error={errors.userId?.message}
          >
            <Select
              value={watchedUserId}
              onValueChange={(v) =>
                setValue("userId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="userId" hasError={!!errors.userId}>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Papel */}
          <FormField
            id="role"
            label="Papel"
            required
            error={errors.role?.message}
          >
            <Select
              value={watchedRole}
              onValueChange={(v) =>
                setValue("role", v as RoleAssignmentInput["role"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="role" hasError={!!errors.role}>
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role] ?? role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Escopo */}
          <FormField
            id="scope"
            label="Escopo"
            required
            error={errors.scope?.message}
          >
            <Select
              value={watchedScope}
              onValueChange={(v) =>
                setValue("scope", v as RoleAssignmentInput["scope"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="scope" hasError={!!errors.scope}>
                <SelectValue placeholder="Selecione o escopo" />
              </SelectTrigger>
              <SelectContent>
                {SCOPES.map((scope) => (
                  <SelectItem key={scope} value={scope}>
                    {SCOPE_LABELS[scope] ?? scope}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Atribuir papel
          </Button>
        </div>
      </form>

      {/* Active assignments table */}
      {activeAssignments.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Atribuições ativas</h3>
          <div className="overflow-hidden rounded-(--radius) border border-(--color-border)">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-muted)/40">
                  <th className="px-4 py-2.5 text-left font-medium text-(--color-muted-foreground)">
                    Usuário
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-(--color-muted-foreground)">
                    Papel
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-(--color-muted-foreground)">
                    Escopo
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-(--color-muted-foreground)">
                    Concedido em
                  </th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {activeAssignments.map((a, idx) => {
                  const user = users.find((u) => u.id === a.userId);
                  return (
                    <tr
                      key={a.id}
                      className={[
                        "transition-colors duration-(--transition-fast)",
                        idx % 2 === 0 ? "" : "bg-(--color-muted)/20",
                        "hover:bg-(--color-primary)/4",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 text-(--color-foreground)">
                        {user?.name ?? a.userId}
                      </td>
                      <td className="px-4 py-3 text-(--color-foreground)">
                        {ROLE_LABELS[a.role] ?? a.role}
                      </td>
                      <td className="px-4 py-3 text-(--color-foreground)">
                        {SCOPE_LABELS[a.scope] ?? a.scope}
                      </td>
                      <td className="px-4 py-3 text-(--color-muted-foreground)">
                        {a.grantedAt.toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onRevoke(a.id)}
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-sm",
                            "text-(--color-muted-foreground) transition-colors duration-(--transition-fast)",
                            "hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)",
                          ].join(" ")}
                          title="Revogar papel"
                          aria-label={`Revogar papel ${ROLE_LABELS[a.role]} de ${user?.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
