"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, AlertTriangle, Check } from "lucide-react";
import { DocumentForm } from "../../../../components/document-form";
import type { DocumentFormValues } from "../../../../components/document-form";
import { EditalForm } from "../../../../components/edital-form";
import type { EditalFormValues } from "../../../../components/edital-form";
import { updateDocument, getUploadUrl } from "../../../../actions/documents";
import { updateEdital } from "../../../../actions/editals";
import { createTag } from "../../../../actions/tags";
import type { Category, DocumentType, Tag } from "@hebron/types/documentos";

type Visibility = "public" | "internal" | "restricted";

interface InitialDocData {
  id: string;
  title: string;
  contentMd: string | null;
  fileUrl: string | null;
  visibility: Visibility;
  type: Exclude<DocumentType, "edital">;
  categoryId: string | null;
  tagIds: string[];
  isEdital: boolean;
  editalOpensAt: Date | null;
  editalClosesAt: Date | null;
  editalProjectType: string | null;
  editalProjectCategory: string | null;
  editalFaq: { q: string; a: string }[];
}

interface UploadResult {
  storagePath: string;
  fileSizeBytes: number;
  mimeType: string;
}

async function uploadFile(file: File): Promise<UploadResult> {
  const mimeType = file.type || "application/pdf";
  const urlResult = await getUploadUrl({
    fileName: file.name,
    mimeType,
  });
  const uploadData = urlResult?.data;
  if (!uploadData) throw new Error("Não foi possível obter URL de upload.");
  const res = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": mimeType },
  });
  if (!res.ok) throw new Error("Falha ao enviar arquivo para o storage.");
  return {
    storagePath: uploadData.storagePath,
    fileSizeBytes: file.size,
    mimeType,
  };
}

async function resolveTagIds(
  tagIds: string[],
  newTags: Tag[],
): Promise<string[]> {
  const localIdMap = new Map<string, string>();
  for (const tag of newTags) {
    const result = await createTag({ name: tag.name });
    const realId = result?.data?.tag?.id;
    if (realId) localIdMap.set(tag.id, realId);
  }
  return tagIds
    .map((id) => localIdMap.get(id) ?? id)
    .filter((id) => !id.startsWith("local-"));
}

function toISODate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0] ?? "";
}

export function EditDocumentClient({
  doc,
  categories,
  availableTags,
}: {
  doc: InitialDocData;
  categories: Category[];
  availableTags: Tag[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasExistingFile = !!doc.fileUrl;
  const contentMode: "markdown" | "pdf" = doc.fileUrl ? "pdf" : "markdown";

  async function handleSubmitDocument(values: DocumentFormValues) {
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const [uploaded, tagIds] = await Promise.all([
        values.contentMode === "pdf" && values.file
          ? uploadFile(values.file)
          : Promise.resolve(undefined),
        resolveTagIds(values.tagIds, values.newTags),
      ]);

      const result = await updateDocument({
        id: doc.id,
        title: values.title,
        contentMd:
          values.contentMode === "markdown" ? values.content : undefined,
        storagePath: uploaded?.storagePath,
        fileSizeBytes: uploaded?.fileSizeBytes,
        mimeType: uploaded?.mimeType,
        visibility: values.visibility,
        type: values.type,
        categoryId: values.categoryId || null,
        tagIds,
        notes: values.versionNotes.trim() || undefined,
        notifySubscribers: values.notifySubscribers,
      });
      if (!result?.data) throw new Error("Falha ao atualizar documento.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar alterações.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitEdital(values: EditalFormValues) {
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const [uploaded, tagIds] = await Promise.all([
        values.contentMode === "pdf" && values.file
          ? uploadFile(values.file)
          : Promise.resolve(undefined),
        resolveTagIds(values.tagIds, values.newTags),
      ]);

      const result = await updateEdital({
        id: doc.id,
        title: values.title,
        contentMd:
          values.contentMode === "markdown" ? values.content : undefined,
        storagePath: uploaded?.storagePath,
        fileSizeBytes: uploaded?.fileSizeBytes,
        mimeType: uploaded?.mimeType,
        visibility: values.visibility,
        categoryId: values.categoryId || null,
        tagIds,
        opensAt:
          values.cycleType === "anual" && values.opensAt
            ? new Date(values.opensAt).toISOString()
            : null,
        closesAt:
          values.cycleType === "anual" && values.closesAt
            ? new Date(values.closesAt).toISOString()
            : null,
        projectType: values.projectType || null,
        projectCategorySlug: (values.projectCategory || null) as Parameters<
          typeof updateEdital
        >[0]["projectCategorySlug"],
        faq: values.faqItems.filter((item) => item.q.trim() && item.a.trim()),
      });
      if (!result?.data) throw new Error("Falha ao atualizar edital.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar alterações.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
        <Link href="/editorial">Área editorial</Link>
        <ChevronRight
          size={12}
          className="docs-breadcrumbs-sep"
          aria-hidden="true"
        />
        <span style={{ color: "var(--fg)" }}>
          {doc.title.length > 48 ? `${doc.title.slice(0, 48)}…` : doc.title}
        </span>
      </nav>

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="hb-eyebrow">
            Editando {doc.isEdital ? "edital" : "documento"}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: "6px 0 4px",
              color: "var(--fg)",
            }}
          >
            {doc.title}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            As alterações criam automaticamente uma nova versão no histórico.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {error && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: "var(--hb-red, #dc2626)",
              }}
            >
              <AlertTriangle size={13} aria-hidden="true" />
              {error}
            </span>
          )}
          {saved && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: "var(--hb-green)",
              }}
            >
              <Check size={13} aria-hidden="true" />
              Salvo
            </span>
          )}
        </div>
      </div>

      {doc.isEdital ? (
        <EditalForm
          mode="edit"
          categories={categories}
          availableTags={availableTags}
          hasExistingFile={hasExistingFile}
          initialValues={{
            title: doc.title,
            visibility: doc.visibility,
            categoryId: doc.categoryId ?? "",
            tagIds: doc.tagIds,
            content: doc.contentMd ?? "",
            contentMode,
            cycleType:
              doc.editalOpensAt || doc.editalClosesAt ? "anual" : "pontual",
            opensAt: toISODate(doc.editalOpensAt),
            closesAt: toISODate(doc.editalClosesAt),
            projectType: doc.editalProjectType ?? "",
            projectCategory: doc.editalProjectCategory ?? "",
            faqItems: doc.editalFaq.length > 0 ? doc.editalFaq : undefined,
          }}
          onSubmit={(values) => void handleSubmitEdital(values)}
          isLoading={isLoading}
        />
      ) : (
        <DocumentForm
          mode="edit"
          categories={categories}
          availableTags={availableTags}
          hasExistingFile={hasExistingFile}
          initialValues={{
            title: doc.title,
            visibility: doc.visibility,
            type: doc.type,
            categoryId: doc.categoryId ?? "",
            tagIds: doc.tagIds,
            content: doc.contentMd ?? "",
            contentMode,
          }}
          onSubmit={(values) => void handleSubmitDocument(values)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
