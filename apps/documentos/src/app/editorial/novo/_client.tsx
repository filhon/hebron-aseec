"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { DocumentForm } from "../../../components/document-form";
import type { DocumentFormValues } from "../../../components/document-form";
import { EditalForm } from "../../../components/edital-form";
import type { EditalFormValues } from "../../../components/edital-form";
import {
  createDocument,
  publishDocument,
  getUploadUrl,
} from "../../../actions/documents";
import { createEdital } from "../../../actions/editals";
import { createTag } from "../../../actions/tags";
import type { Category, Tag } from "@hebron/types/documentos";

type DocType = "documento" | "edital";

/**
 * Resolve tags criadas localmente no formulário (ids `local-*`) em tags
 * reais no banco, substituindo-os pelo id definitivo na lista final.
 */
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

export function NovoDocumentoClient({
  categories,
  availableTags,
}: {
  categories: Category[];
  availableTags: Tag[];
}) {
  const router = useRouter();
  const [docType, setDocType] = useState<DocType>("edital");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitDocument(values: DocumentFormValues) {
    setIsLoading(true);
    setError(null);
    try {
      const [uploaded, tagIds] = await Promise.all([
        values.contentMode === "pdf" && values.file
          ? uploadFile(values.file)
          : Promise.resolve(undefined),
        resolveTagIds(values.tagIds, values.newTags),
      ]);

      const result = await createDocument({
        title: values.title,
        contentMd:
          values.contentMode === "markdown" ? values.content : undefined,
        storagePath: uploaded?.storagePath,
        fileSizeBytes: uploaded?.fileSizeBytes,
        mimeType: uploaded?.mimeType,
        visibility: values.visibility,
        type: values.type,
        categoryId: values.categoryId || undefined,
        tagIds,
      });
      const docId = result?.data?.document?.id;
      if (!docId) throw new Error("Falha ao criar documento.");

      await publishDocument({ id: docId });
      router.push("/editorial");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitEdital(values: EditalFormValues) {
    setIsLoading(true);
    setError(null);
    try {
      const [uploaded, tagIds] = await Promise.all([
        values.contentMode === "pdf" && values.file
          ? uploadFile(values.file)
          : Promise.resolve(undefined),
        resolveTagIds(values.tagIds, values.newTags),
      ]);

      const result = await createEdital({
        title: values.title,
        contentMd:
          values.contentMode === "markdown" ? values.content : undefined,
        storagePath: uploaded?.storagePath,
        visibility: values.visibility,
        categoryId: values.categoryId || undefined,
        tagIds,
        cycleType: values.cycleType,
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
          typeof createEdital
        >[0]["projectCategorySlug"],
        faq: values.faqItems.filter((item) => item.q.trim() && item.a.trim()),
      });
      const docId = result?.data?.document?.id;
      if (!docId) throw new Error("Falha ao criar edital.");

      await publishDocument({ id: docId });
      router.push("/editorial");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar.");
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
        <span style={{ color: "var(--fg)" }}>Novo documento</span>
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
          <span className="hb-eyebrow">Criando</span>
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
            Novo documento / edital
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            Publica imediatamente ao salvar.
          </p>
        </div>

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
      </div>

      {/* Doc type toggle */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 20 }}
        role="group"
        aria-label="Tipo de publicação"
      >
        <button
          type="button"
          className={`hb-chip ${docType === "edital" ? "active" : ""}`}
          onClick={() => setDocType("edital")}
        >
          Edital
        </button>
        <button
          type="button"
          className={`hb-chip ${docType === "documento" ? "active" : ""}`}
          onClick={() => setDocType("documento")}
        >
          Documento
        </button>
      </div>

      {docType === "edital" ? (
        <EditalForm
          categories={categories}
          availableTags={availableTags}
          onSubmit={(values) => void handleSubmitEdital(values)}
          isLoading={isLoading}
        />
      ) : (
        <DocumentForm
          categories={categories}
          availableTags={availableTags}
          onSubmit={(values) => void handleSubmitDocument(values)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
