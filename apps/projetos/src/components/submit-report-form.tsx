"use client";

import { useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Check, Loader2, Paperclip, Send, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@hebron/auth/client";
import { submitReport } from "../actions/reports";

interface SubmitReportFormProps {
  reportId: string;
}

type UploadedFile = { fileUrl: string; fileName: string; fileSize: number };

/**
 * Formulário real de envio de relatório (F2-P1): o `report-form.tsx` do
 * Bloco A tinha campos sem coluna correspondente no banco (narrativa,
 * resultadosAlcancados, dificuldades, proximosPassos, beneficiariosAtingidos
 * como campos separados) — `projetos.reports` só tem `content` (texto único).
 * Este componente novo casa exatamente com o schema real de `submitReport`.
 */
export function SubmitReportForm({ reportId }: SubmitReportFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { execute, isPending, result } = useAction(submitReport, {
    onSuccess() {
      setOpen(false);
      setContent("");
      setAttachments([]);
      router.refresh();
    },
  });

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: storageError } = await supabase.storage
        .from("project-attachments")
        .upload(path, file, { contentType: file.type });
      if (storageError) throw new Error(storageError.message);

      const { data: signedData, error: signedError } = await supabase.storage
        .from("project-attachments")
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);
      if (signedError) throw new Error(signedError.message);

      setAttachments((prev) => [
        ...prev,
        {
          fileUrl: signedData.signedUrl,
          fileName: file.name,
          fileSize: file.size,
        },
      ]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erro ao enviar arquivo.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "var(--hb-green)" }}
      >
        <Send className="w-3.5 h-3.5" aria-hidden />
        Enviar
      </button>
    );
  }

  return (
    <div className="rounded-md border border-(--border) bg-(--surface-alt) px-4 py-4 mt-2">
      <textarea
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Descreva o período: atividades realizadas, resultados alcançados, dificuldades e próximos passos (mín. 100 caracteres)…"
        className="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) resize-none"
      />
      <p className="text-xs text-(--fg-muted) mt-1 text-right">
        {content.trim().length}/10000 (mín. 100)
      </p>

      <div className="mt-3">
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-(--radius) border border-(--border) px-3 py-1.5 text-xs font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors disabled:opacity-50"
        >
          <Paperclip className="w-3.5 h-3.5" aria-hidden />
          {uploading ? "Enviando…" : "Anexar arquivo"}
        </button>
        {uploadError && (
          <p className="text-xs text-(--color-destructive) mt-1">
            {uploadError}
          </p>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {attachments.map((a) => (
              <div
                key={a.fileUrl}
                className="flex items-center gap-2 text-xs text-(--fg)"
              >
                <Check
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "var(--hb-green-fg)" }}
                  aria-hidden
                />
                <span className="truncate">{a.fileName}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((x) => x.fileUrl !== a.fileUrl),
                    )
                  }
                  className="shrink-0 text-(--fg-muted) hover:text-(--color-destructive)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {result.serverError && (
        <p className="text-xs text-(--color-destructive) mt-2">
          {result.serverError}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-(--radius) border border-(--border) px-3 py-1.5 text-xs font-semibold text-(--fg-muted)"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={content.trim().length < 100 || isPending}
          onClick={() =>
            execute({ reportId, content: content.trim(), attachments })
          }
          className="flex-1 flex items-center justify-center gap-2 rounded-(--radius) py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-green)" }}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="w-3.5 h-3.5" aria-hidden />
          )}
          {isPending ? "Enviando…" : "Confirmar Envio"}
        </button>
      </div>
    </div>
  );
}
