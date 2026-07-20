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
import { designationSchema, type DesignationInput } from "@hebron/validators";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignationFormUser {
  id: string;
  name: string;
}

export interface DesignationFormDesignation {
  id: string;
  userId: string;
  directorName: string;
  type: DesignationInput["type"];
  assignedAt: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DESIGNATION_TYPE_LABELS = {
  gestor: "Gestor",
  autorizador: "Autorizador",
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesignationFormProps {
  /** Apenas usuários com papel de diretor */
  directors: DesignationFormUser[];
  designations: DesignationFormDesignation[];
  onAssign: (data: DesignationInput) => void | Promise<void>;
  onRevoke: (designationId: string) => void | Promise<void>;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignationForm({
  directors,
  designations,
  onAssign,
  onRevoke,
  isLoading,
}: DesignationFormProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DesignationInput>({
    resolver: zodResolver(designationSchema),
    defaultValues: {
      userId: "",
      type: "gestor",
    },
  });

  const loading = isLoading ?? isSubmitting;
  const watchedUserId = watch("userId");
  const watchedType = watch("type");

  async function handleAssign(data: DesignationInput) {
    await onAssign(data);
    reset();
  }

  // Toda designação presente já está ativa — revogar apaga a linha (hard delete).
  const activeDesignations = designations;

  return (
    <div className="flex flex-col gap-8">
      {/* Form */}
      <form
        onSubmit={handleSubmit(handleAssign)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div>
          <h3 className="text-sm font-semibold">Configurar designação</h3>
          <p className="mt-1 text-xs">
            Somente diretores podem ser designados como gestor ou autorizador.
          </p>
        </div>

        {directors.length === 0 ? (
          <div className="rounded-(--radius) border border-(--border) px-4 py-6 text-center">
            <p className="text-sm">
              Nenhum diretor encontrado. Atribua o papel de diretor a um usuário
              primeiro.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Diretor */}
              <FormField
                id="userId"
                label="Diretor"
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
                    <SelectValue placeholder="Selecione um diretor" />
                  </SelectTrigger>
                  <SelectContent>
                    {directors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Tipo */}
              <FormField
                id="type"
                label="Tipo"
                required
                error={errors.type?.message}
              >
                <Select
                  value={watchedType}
                  onValueChange={(v) =>
                    setValue("type", v as DesignationInput["type"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="type" hasError={!!errors.type}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="autorizador">Autorizador</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Designar
              </Button>
            </div>
          </>
        )}
      </form>

      {/* Active designations */}
      {activeDesignations.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Designações ativas</h3>
          <div className="overflow-hidden rounded-(--radius) border border-(--border)">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border) bg-(--surface-alt)/40">
                  <th className="px-4 py-2.5 text-left font-medium text-(--fg-muted)">
                    Diretor
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-(--fg-muted)">
                    Tipo
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-(--fg-muted)">
                    Desde
                  </th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {activeDesignations.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={[
                      "transition-colors duration-(--transition-fast)",
                      idx % 2 === 0 ? "" : "bg-(--surface-alt)/20",
                      "hover:bg-(--hb-blue)/4",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 text-(--fg)">{d.directorName}</td>
                    <td className="px-4 py-3 text-(--fg)">
                      {DESIGNATION_TYPE_LABELS[d.type]}
                    </td>
                    <td className="px-4 py-3 text-(--fg-muted)">
                      {d.assignedAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onRevoke(d.id)}
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-sm",
                          "text-(--fg-muted) transition-colors duration-(--transition-fast)",
                          "hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)",
                        ].join(" ")}
                        title="Revogar designação"
                        aria-label={`Revogar designação de ${d.directorName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
