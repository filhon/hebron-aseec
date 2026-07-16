"use client";

import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import {
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { getSession, getSupabaseBrowserClient } from "@hebron/auth/client";
import type { MinistryType } from "@hebron/types/flats";
import type { ReservationWizardValues } from "../reservation-wizard";

const MINISTRY_TYPE_OPTIONS: { value: MinistryType; label: string }[] = [
  { value: "pastor", label: "Pastor" },
  { value: "missionario", label: "Missionário" },
  { value: "conjuge_pastor", label: "Cônjuge de pastor" },
  { value: "conjuge_missionario", label: "Cônjuge de missionário" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type UploadStatus = "idle" | "uploading" | "error";

export function StepGuest() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const today = new Date().toISOString().slice(0, 10);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);

  const ministryType = watch("guest.ministryType");
  const documentUrl = watch("guest.responsibleDocumentUrl");
  const guestErrors = errors.guest;

  async function handleFileSelected(file: File) {
    setUploadErrorMessage(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadErrorMessage("Envie um arquivo PDF, JPEG ou PNG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadErrorMessage("O arquivo deve ter no máximo 10 MB.");
      return;
    }

    setUploadStatus("uploading");
    try {
      const { session, error: sessionError } = await getSession();
      if (sessionError || !session) {
        throw new Error(
          "Sessão expirada. Faça login novamente para enviar o documento.",
        );
      }

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

      const supabase = getSupabaseBrowserClient();
      const { data, error: storageError } = await supabase.storage
        .from("flats-documentos")
        .upload(path, file, { contentType: file.type });
      if (storageError) throw new Error(storageError.message);

      setValue("guest.responsibleDocumentUrl", data.path, {
        shouldValidate: true,
      });
      setFileName(file.name);
      setUploadStatus("idle");
    } catch (err) {
      setUploadStatus("error");
      setUploadErrorMessage(
        err instanceof Error ? err.message : "Falha ao enviar o documento.",
      );
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-(--font-display) text-lg text-(--fg)">
        Dados do responsável
      </h2>

      <FormField
        id="guest.responsibleName"
        label="Nome completo"
        required
        error={guestErrors?.responsibleName?.message}
      >
        <Input
          hasError={!!guestErrors?.responsibleName}
          {...register("guest.responsibleName")}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="guest.responsibleCpf"
          label="CPF"
          required
          hint="Somente números"
          error={guestErrors?.responsibleCpf?.message}
        >
          <Input
            maxLength={11}
            hasError={!!guestErrors?.responsibleCpf}
            {...register("guest.responsibleCpf")}
          />
        </FormField>

        <FormField
          id="guest.responsibleBirthDate"
          label="Data de nascimento"
          required
          error={guestErrors?.responsibleBirthDate?.message}
        >
          <Input
            type="date"
            max={today}
            hasError={!!guestErrors?.responsibleBirthDate}
            {...register("guest.responsibleBirthDate")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="guest.responsibleEmail"
          label="E-mail"
          required
          error={guestErrors?.responsibleEmail?.message}
        >
          <Input
            type="email"
            hasError={!!guestErrors?.responsibleEmail}
            {...register("guest.responsibleEmail")}
          />
        </FormField>

        <FormField
          id="guest.responsiblePhone"
          label="Telefone"
          required
          error={guestErrors?.responsiblePhone?.message}
        >
          <Input
            type="tel"
            hasError={!!guestErrors?.responsiblePhone}
            {...register("guest.responsiblePhone")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="guest.ministryType"
          label="Tipo de ministério"
          required
          error={guestErrors?.ministryType?.message}
        >
          <Select
            value={ministryType}
            onValueChange={(v) =>
              setValue("guest.ministryType", v as MinistryType, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger
              id="guest.ministryType"
              hasError={!!guestErrors?.ministryType}
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {MINISTRY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="guest.ministryStartDate"
          label="Início do ministério"
          required
          hint="Usado no cálculo de tempo de ministério (critério a)"
          error={guestErrors?.ministryStartDate?.message}
        >
          <Input
            type="date"
            max={today}
            hasError={!!guestErrors?.ministryStartDate}
            {...register("guest.ministryStartDate")}
          />
        </FormField>
      </div>

      <FormField
        id="guest.responsibleDocumentUrl"
        label="Documento de identidade do responsável"
        required
        hint="PDF, JPEG ou PNG, até 10 MB. Armazenado com acesso restrito."
        error={
          guestErrors?.responsibleDocumentUrl?.message ??
          uploadErrorMessage ??
          undefined
        }
      >
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileSelected(file);
              event.target.value = "";
            }}
          />

          {documentUrl ? (
            <div className="flex items-center justify-between gap-2 rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-(--fg)">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {fileName ?? "Documento enviado"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setValue("guest.responsibleDocumentUrl", null, {
                    shouldValidate: true,
                  });
                  setFileName(null);
                }}
                className="shrink-0 rounded-sm p-1.5 text-(--fg-muted) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt) hover:text-(--color-destructive)"
                aria-label="Remover documento"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadStatus === "uploading"}
              className="flex items-center justify-center gap-2 rounded-(--radius) border border-dashed border-(--border) px-4 py-6 text-sm text-(--fg-muted) transition-colors duration-(--transition-fast) hover:border-(--brand) hover:text-(--brand) disabled:pointer-events-none disabled:opacity-60"
            >
              {uploadStatus === "uploading" ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Enviando…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Selecionar arquivo
                </>
              )}
            </button>
          )}
        </div>
      </FormField>
    </section>
  );
}
