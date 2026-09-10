"use client";

import { useRef, useState } from "react";
import { Upload as TusUpload } from "tus-js-client";
import {
  Check,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  Video,
  type LucideIcon,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@hebron/auth/client";
import { createAttachmentVideoUpload } from "../../actions/video-upload";
import { FieldError } from "./field-controls";
import type {
  AttachmentItem,
  AttachmentKind,
  WizardFormData,
} from "../project-wizard";

// P-2.20 CORRETIVO (AUDIT/06 §1.7, Q47/Q54) — o wizard coletava dois PDFs
// genéricos e um checkbox de autodeclaração para a carta de recomendação.
// Passam a existir 5 destinos tipados: os dois institucionais (inalterados)
// mais vídeo de apresentação (Bunny Stream, P-6.20), planilha de orçamento e
// carta — os três últimos obrigatórios no anual, opcionais no pontual (mas
// sempre com o campo presente). Vocabulário visual único para os 5 (mesmo
// badge de ícone, mesmo botão, mesmo estado de carregamento) — dois padrões
// diferentes na mesma etapa seria inconsistência, não variedade.

const SPREADSHEET_ACCEPT =
  ".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet";
const CARTA_ACCEPT = "application/pdf,image/jpeg,image/png";
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,video/x-matroska";
const VIDEO_ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
];
const VIDEO_MAX_DURATION_SECONDS = 3 * 60;

type DocSpec = {
  kind: AttachmentKind;
  label: string;
  labelSuffix?: string;
  description: string;
  accept: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

const INSTITUTIONAL_DOCS: DocSpec[] = [
  {
    kind: "projeto",
    label: "Documento do Projeto",
    description: "PDF com a proposta completa · máx. 10MB",
    accept: "application/pdf",
    icon: Paperclip,
    iconBg: "var(--surface-alt)",
    iconColor: "var(--fg-muted)",
  },
  {
    kind: "estatuto",
    label: "Estatuto ou CNPJ",
    description: "Comprovante de regularidade da instituição",
    accept: "application/pdf,image/jpeg,image/png",
    icon: Paperclip,
    iconBg: "var(--surface-alt)",
    iconColor: "var(--fg-muted)",
  },
];

const PRESENTATION_DOCS: DocSpec[] = [
  {
    kind: "video",
    label: "Vídeo de apresentação",
    labelSuffix: "(até 3 min)",
    description:
      "MP4, MOV, WebM ou MKV · o principal insumo de avaliação da diretoria",
    accept: VIDEO_ACCEPT,
    icon: Video,
    iconBg: "color-mix(in srgb, var(--hb-green-deep) 18%, transparent)",
    iconColor: "var(--hb-green-deep)",
  },
  {
    kind: "planilha",
    label: "Planilha de orçamento",
    description: "XLSX, XLS, CSV ou ODS · orçamento completo por etapas",
    accept: SPREADSHEET_ACCEPT,
    icon: FileSpreadsheet,
    iconBg: "var(--brand-tint-strong)",
    iconColor: "var(--hb-blue)",
  },
  {
    kind: "carta",
    label: "Carta de recomendação",
    description:
      "PDF, JPG ou PNG · assinada por liderança reconhecida pela Hebron Aseec",
    accept: CARTA_ACCEPT,
    icon: Paperclip,
    iconBg: "var(--surface-alt)",
    iconColor: "var(--fg-muted)",
  },
];

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Não foi possível ler o vídeo."));
    video.src = URL.createObjectURL(file);
  });
}

function AttachmentRow({
  doc,
  required,
  uploaded,
  isUploading,
  progress,
  onSelectFile,
  onRemove,
}: {
  doc: DocSpec;
  required: boolean;
  uploaded?: AttachmentItem;
  isUploading: boolean;
  progress?: number;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = doc.icon;

  return (
    <div
      className="rounded-md border px-4 py-4 flex items-start gap-4"
      style={{
        borderColor: uploaded ? "var(--hb-green)" : "var(--border)",
        borderStyle: uploaded ? "solid" : "dashed",
        backgroundColor: uploaded
          ? "var(--hb-green-muted)"
          : "var(--surface-alt)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={doc.accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile(file);
          e.target.value = "";
        }}
      />

      <div
        className="w-10 h-10 rounded-(--radius) flex items-center justify-center shrink-0"
        style={{ background: doc.iconBg, color: doc.iconColor }}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Icon className="w-4 h-4" aria-hidden />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: uploaded ? "var(--hb-green-fg)" : "var(--fg)" }}
        >
          {doc.label}
          {doc.labelSuffix && (
            <span className="font-normal text-(--fg-muted)">
              {" "}
              {doc.labelSuffix}
            </span>
          )}
          {!required && (
            <span className="font-normal text-(--fg-muted)"> (opcional)</span>
          )}
        </p>

        {uploaded ? (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "var(--hb-green-fg)", opacity: 0.85 }}
          >
            {uploaded.fileName}
            {doc.kind !== "video" &&
              ` · ${Math.round(uploaded.fileSize / 1024)} KB`}
          </p>
        ) : (
          <p className="text-xs text-(--fg-muted) mt-0.5">{doc.description}</p>
        )}

        {isUploading && progress !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div
              role="progressbar"
              aria-label={`Progresso do upload de ${doc.label}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 flex-1 overflow-hidden rounded-(--radius-pill) bg-(--border)"
            >
              <div
                className="h-full rounded-(--radius-pill) bg-(--hb-orange) transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-(--fg-muted) tabular-nums shrink-0">
              {progress}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {uploaded && (
          <Check
            className="w-4 h-4"
            style={{ color: "var(--hb-green-deep)" }}
            aria-hidden
          />
        )}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => {
            if (uploaded) onRemove();
            else inputRef.current?.click();
          }}
          className="rounded-(--radius) border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            uploaded
              ? { borderColor: "var(--hb-green)", color: "var(--hb-green-fg)" }
              : { borderColor: "var(--border)", color: "var(--fg-muted)" }
          }
        >
          {isUploading ? "Enviando…" : uploaded ? "Trocar" : "Selecionar"}
        </button>
      </div>
    </div>
  );
}

export function StepAttachments({
  data,
  onChange,
  error,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  error?: string;
}) {
  const isAnnual = data.projectType === "anual";
  const [uploadingKind, setUploadingKind] = useState<AttachmentKind | null>(
    null,
  );
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function setAttachment(item: AttachmentItem) {
    onChange({
      anexos: [...data.anexos.filter((a) => a.kind !== item.kind), item],
    });
  }

  function removeAttachment(kind: AttachmentKind) {
    onChange({ anexos: data.anexos.filter((a) => a.kind !== kind) });
  }

  async function handleFileChange(kind: AttachmentKind, file: File) {
    setUploadError(null);
    setUploadingKind(kind);

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

      setAttachment({
        kind,
        storagePath: uploadData.path,
        fileUrl: signedData.signedUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erro ao enviar arquivo.",
      );
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleVideoFileChange(file: File) {
    setUploadError(null);

    if (!VIDEO_ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError(
        "Formato de vídeo não suportado. Use MP4, MOV, WebM ou MKV.",
      );
      return;
    }

    // Avisa o limite de 3 minutos ANTES de começar o upload, não depois
    // (escopo do corretivo) — lê a duração do arquivo local, sem subir nada.
    let durationSeconds: number;
    try {
      durationSeconds = await readVideoDurationSeconds(file);
    } catch {
      setUploadError("Não foi possível verificar a duração do vídeo.");
      return;
    }
    if (durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
      setUploadError(
        `Vídeo com ${Math.ceil(durationSeconds / 60)} min excede o limite de 3 minutos.`,
      );
      return;
    }

    setUploadingKind("video");
    setVideoProgress(0);

    const result = await createAttachmentVideoUpload({
      title: data.titulo || file.name,
    }).catch(() => null);

    const uploadCreds = result?.data;
    if (!uploadCreds) {
      setUploadError(
        result?.serverError ?? "Não foi possível iniciar o upload do vídeo.",
      );
      setUploadingKind(null);
      return;
    }

    const upload = new TusUpload(file, {
      endpoint: uploadCreds.upload.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        AuthorizationSignature: uploadCreds.upload.authorizationSignature,
        AuthorizationExpire: String(uploadCreds.upload.authorizationExpire),
        VideoId: uploadCreds.upload.videoId,
        LibraryId: uploadCreds.upload.libraryId,
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress: (bytesSent: number, bytesTotal: number) => {
        setVideoProgress(Math.round((bytesSent / bytesTotal) * 100));
      },
      onSuccess: () => {
        setUploadingKind(null);
        setAttachment({
          kind: "video",
          bunnyVideoId: uploadCreds.videoId,
          fileName: file.name,
          fileSize: file.size,
        });
      },
      onError: () => {
        setUploadingKind(null);
        setUploadError("Falha ao enviar o vídeo. Tente novamente.");
      },
    });

    upload.start();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-(--fg) mb-3">
          Apresentação do projeto
        </p>
        <div className="flex flex-col gap-3">
          {PRESENTATION_DOCS.map((doc) => (
            <AttachmentRow
              key={doc.kind}
              doc={doc}
              required={isAnnual}
              uploaded={data.anexos.find((a) => a.kind === doc.kind)}
              isUploading={uploadingKind === doc.kind}
              progress={doc.kind === "video" ? videoProgress : undefined}
              onSelectFile={(file) =>
                void (doc.kind === "video"
                  ? handleVideoFileChange(file)
                  : handleFileChange(doc.kind, file))
              }
              onRemove={() => removeAttachment(doc.kind)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-(--fg) mb-3">
          Documentos institucionais
        </p>
        <div className="flex flex-col gap-3">
          {INSTITUTIONAL_DOCS.map((doc) => (
            <AttachmentRow
              key={doc.kind}
              doc={doc}
              required
              uploaded={data.anexos.find((a) => a.kind === doc.kind)}
              isUploading={uploadingKind === doc.kind}
              onSelectFile={(file) => void handleFileChange(doc.kind, file)}
              onRemove={() => removeAttachment(doc.kind)}
            />
          ))}
        </div>
      </div>

      {uploadError && (
        <p className="text-sm text-(--color-destructive)">{uploadError}</p>
      )}
      <FieldError id="anexos-error" error={error} />
    </div>
  );
}
