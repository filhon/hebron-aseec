"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormField,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hebron/ui";
import { meetingSchema, type MeetingInput } from "@hebron/validators";

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_TYPE_LABELS = {
  mensal: "Mensal",
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeetingFormDirector {
  id: string;
  name: string;
}

export interface MeetingFormMeeting {
  date: Date;
  type: "mensal" | "ordinaria" | "extraordinaria";
  chairUserId: string | null;
  notes: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MeetingFormProps {
  /** Usuários que podem presidir reuniões (diretores) */
  directors: MeetingFormDirector[];
  meeting?: MeetingFormMeeting;
  onSubmit: (data: MeetingInput) => void | Promise<void>;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MeetingForm({
  directors,
  meeting,
  onSubmit,
  isLoading,
}: MeetingFormProps) {
  const isEdit = meeting !== undefined;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MeetingInput>({
    resolver: zodResolver(meetingSchema),
    defaultValues: isEdit
      ? {
          date: toDateInputValue(meeting.date),
          type: meeting.type,
          chairUserId: meeting.chairUserId ?? "",
          notes: meeting.notes ?? "",
        }
      : {
          date: "",
          type: "mensal",
          chairUserId: "",
          notes: "",
        },
  });

  const loading = isLoading ?? isSubmitting;
  const watchedType = watch("type");
  const watchedChair = watch("chairUserId");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Data e hora */}
      <FormField
        id="date"
        label="Data e hora"
        required
        error={errors.date?.message}
      >
        <Input
          id="date"
          type="datetime-local"
          hasError={!!errors.date}
          {...register("date")}
        />
      </FormField>

      {/* Tipo de reunião */}
      <FormField
        id="type"
        label="Tipo de reunião"
        required
        error={errors.type?.message}
      >
        <Select
          value={watchedType}
          onValueChange={(v) =>
            setValue("type", v as MeetingInput["type"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="type" hasError={!!errors.type}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["mensal", "ordinaria", "extraordinaria"] as const).map((t) => (
              <SelectItem key={t} value={t}>
                {MEETING_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Presidente */}
      <FormField
        id="chairUserId"
        label="Presidente"
        required
        hint="Somente diretores podem presidir reuniões"
        error={errors.chairUserId?.message}
      >
        {directors.length === 0 ? (
          <div className="flex h-10 items-center rounded-(--radius) border border-(--color-border) px-3">
            <span className="text-sm">Nenhum diretor disponível</span>
          </div>
        ) : (
          <Select
            value={watchedChair}
            onValueChange={(v) =>
              setValue("chairUserId", v, { shouldValidate: true })
            }
          >
            <SelectTrigger id="chairUserId" hasError={!!errors.chairUserId}>
              <SelectValue placeholder="Selecione o presidente" />
            </SelectTrigger>
            <SelectContent>
              {directors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      {/* Notas */}
      <FormField
        id="notes"
        label="Notas"
        hint="Pauta ou observações iniciais (opcional)"
        error={errors.notes?.message}
      >
        <textarea
          id="notes"
          rows={4}
          placeholder="Pauta da reunião, observações..."
          className={[
            "flex w-full resize-y",
            "rounded-(--radius) border border-(--color-border)",
            "bg-(--color-input-bg) text-(--color-foreground)",
            "px-3 py-2 text-sm",
            "placeholder:text-(--color-muted-foreground)",
            "transition-colors duration-(--transition-fast)",
            "hover:border-(--color-primary)/50",
            "focus-visible:outline-none focus-visible:border-(--color-primary)",
            "focus-visible:ring-2 focus-visible:ring-(--color-ring)/20",
            errors.notes
              ? "border-(--color-destructive) focus-visible:ring-(--color-destructive)/20"
              : "",
          ].join(" ")}
          {...register("notes")}
        />
      </FormField>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 border-t border-(--color-border) pt-4">
        <Button type="submit" loading={loading}>
          {isEdit ? "Salvar alterações" : "Agendar reunião"}
        </Button>
      </div>
    </form>
  );
}
