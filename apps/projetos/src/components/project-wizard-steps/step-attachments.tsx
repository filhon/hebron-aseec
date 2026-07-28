"use client";

import { useRef, useState } from "react";
import { Check, Paperclip } from "lucide-react";
import { getSupabaseBrowserClient } from "@hebron/auth/client";
import type { WizardFormData, AttachmentItem } from "../project-wizard";

// Documentos aceitos pelo bucket `project-attachments` (0020_storage_buckets.sql):
// application/pdf, image/jpeg, image/png — teto de 10 MB. Vídeo e planilha,
// prometidos pelo P-2.4 original, não cabem neste bucket (ver PROMPTS.md,
// bookkeeping de P-2.4b item 4): exigiriam nova migration de
// allowed_mime_types/file_size_limit ou roteamento a um provedor de vídeo
// (Bunny Stream), fora dos arquivos permitidos deste corretivo.
const REQUIRED_DOCS = [
  {
    id: "projeto",
    label: "Documento do Projeto",
    description: "PDF com proposta completa (máx. 10MB)",
    accept: "application/pdf",
  },
  {
    id: "estatuto",
    label: "Estatuto ou CNPJ",
    description: "Comprovante de regularidade da instituição",
    accept: "application/pdf,image/jpeg,image/png",
  },
];

export function StepAttachments({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
}) {
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileChange(docId: string, file: File) {
    setUploadError(null);
    setUploadingDocId(docId);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: storageError } = await supabase.storage
        .from("project-attachments")
        .upload(path, file, { contentType: file.type });

      if (storageError) throw new Error(storageError.message);

      const { data: signedData, error: signedError } = await supabase.storage
        .from("project-attachments")
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);

      if (signedError) throw new Error(signedError.message);

      const item: AttachmentItem = {
        docId,
        storagePath: uploadData.path,
        fileUrl: signedData.signedUrl,
        fileName: file.name,
        fileSize: file.size,
      };

      onChange({
        anexos: [...data.anexos.filter((a) => a.docId !== docId), item],
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erro ao enviar arquivo.",
      );
    } finally {
      setUploadingDocId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-(--fg-muted)">
        Envie os documentos necessários para análise do projeto.
      </p>

      {/* Carta de recomendação */}
      <div
        className="rounded-md border border-(--border) bg-(--surface) px-4 py-4 flex items-start gap-3"
        style={{ cursor: "pointer" }}
        onClick={() => onChange({ cartaRecomendacao: !data.cartaRecomendacao })}
      >
        <div
          className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
          style={{
            borderColor: data.cartaRecomendacao
              ? "var(--hb-blue)"
              : "var(--border)",
            backgroundColor: data.cartaRecomendacao
              ? "var(--hb-blue)"
              : "transparent",
          }}
        >
          {data.cartaRecomendacao && (
            <Check className="w-3 h-3 text-white" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-(--fg)">
            Carta de Recomendação
          </p>
          <p className="text-xs text-(--fg-muted) mt-0.5">
            Confirmo que possuo carta de recomendação assinada por liderança
            reconhecida pela Hebron Aseec.
          </p>
        </div>
      </div>

      {/* Documentos obrigatórios */}
      <div className="flex flex-col gap-3">
        {REQUIRED_DOCS.map((doc) => {
          const uploaded = data.anexos.find((a) => a.docId === doc.id);
          const isUploading = uploadingDocId === doc.id;

          return (
            <div key={doc.id}>
              {/* Hidden file input */}
              <input
                ref={(el) => {
                  fileRefs.current[doc.id] = el;
                }}
                type="file"
                accept={doc.accept}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileChange(doc.id, file);
                  e.target.value = "";
                }}
              />

              {uploaded ? (
                <div className="rounded-md border border-(--hb-green) bg-(--hb-green-muted) px-4 py-3 flex items-center gap-3">
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: "var(--hb-green-fg)" }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--hb-green-fg)" }}
                    >
                      {doc.label}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--hb-green-fg)", opacity: 0.8 }}
                    >
                      {uploaded.fileName} ·{" "}
                      {Math.round(uploaded.fileSize / 1024)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        anexos: data.anexos.filter((a) => a.docId !== doc.id),
                      })
                    }
                    className="shrink-0 text-xs font-semibold hover:opacity-70 transition-opacity"
                    style={{ color: "var(--hb-green-fg)" }}
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-(--border) bg-(--surface-alt) px-4 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-(--radius) bg-(--surface) border border-(--border) flex items-center justify-center shrink-0">
                    <Paperclip
                      className="w-4 h-4 text-(--fg-muted)"
                      aria-hidden
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-(--fg)">
                      {doc.label}
                    </p>
                    <p className="text-xs text-(--fg-muted)">
                      {doc.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileRefs.current[doc.id]?.click()}
                    className="shrink-0 rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Enviando…" : "Selecionar"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {uploadError && (
        <p className="text-sm text-(--color-destructive)">{uploadError}</p>
      )}
    </div>
  );
}
