"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { FileText, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
} from "@hebron/ui";
import type { ExclusiveMaterial } from "@hebron/types/radio";
import {
  MaterialUploadForm,
  type MaterialUploadFormValues,
} from "./material-upload-form";
import { createMaterial, getMaterialUploadUrl } from "../actions/materials";

export interface MaterialsAdminPanelProps {
  materials: ExclusiveMaterial[];
}

const MATERIAL_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
] as const;

type MaterialContentType = (typeof MATERIAL_CONTENT_TYPES)[number];

function normalizeMaterialContentType(type: string): MaterialContentType {
  return (MATERIAL_CONTENT_TYPES as readonly string[]).includes(type)
    ? (type as MaterialContentType)
    : "application/pdf";
}

/** Materiais exclusivos: só upload/criação (sem edição/remoção) — escopo
 * literal de P-8.8 (`actions/materials.ts` só expõe `createMaterial`). */
export function MaterialsAdminPanel({ materials }: MaterialsAdminPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const { execute: create, status: createStatus } = useAction(createMaterial, {
    onSuccess: () => {
      setCreateOpen(false);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao criar material"),
  });

  async function handleSubmit(values: MaterialUploadFormValues) {
    setFormError(null);
    setIsUploading(true);
    try {
      const uploadResult = await getMaterialUploadUrl({
        fileName: values.file.name,
        contentType: normalizeMaterialContentType(values.file.type),
      });
      if (!uploadResult?.data) {
        throw new Error(
          uploadResult?.serverError ?? "Falha ao preparar upload",
        );
      }
      await fetch(uploadResult.data.uploadUrl, {
        method: "PUT",
        body: values.file,
        headers: { "Content-Type": values.file.type || "application/pdf" },
      });
      create({
        title: values.title,
        description: values.description || null,
        fileUrl: uploadResult.data.key,
        requiresTerm: values.requiresTerm,
      });
    } catch {
      setFormError("Falha ao enviar o arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section aria-labelledby="materiais-admin-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="materiais-admin-heading"
          className="flex items-center gap-2 font-(family-name:--font-display) text-base font-semibold text-(--fg)"
        >
          <FileText className="h-4.5 w-4.5 text-(--brand)" aria-hidden="true" />
          Materiais exclusivos ({materials.length})
        </h2>
        <Button
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          Novo material
        </Button>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          title="Nenhum material cadastrado"
          description="Envie o primeiro material de apoio às séries da rádio."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-(--divider) rounded-md border border-(--border)">
          {materials.map((material) => (
            <li key={material.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-(--fg)">
                  {material.title}
                </p>
                <p className="truncate text-xs text-(--fg-muted)">
                  {material.description || "Sem descrição"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-(--fg-muted)">
                {material.requiresTerm
                  ? "Requer aceite do termo"
                  : "Sem restrição"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo material</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          <MaterialUploadForm
            onSubmit={handleSubmit}
            isLoading={isUploading || createStatus === "executing"}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
