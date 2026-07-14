"use client";

import * as React from "react";
import { useAction } from "next-safe-action/hooks";
import type { Certificate } from "@hebron/types/plataforma";
import { Button } from "@hebron/ui";
import { Award, Check, Copy, Download } from "lucide-react";
import { downloadCertificatePdf } from "../actions/certificates";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function downloadPdfFromBase64(fileName: string, base64: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface CertificateCardProps {
  certificate: Certificate;
  className?: string;
}

/** Cartão de certificado — emissão automática ao concluir 100% da trilha
 * (BRAIN §6.3). O hash é o código de verificação de autenticidade (PATCH-010).
 * O download gera o PDF real via downloadCertificatePdf (P-6.8). */
export function CertificateCard({
  certificate,
  className,
}: CertificateCardProps) {
  const [copied, setCopied] = React.useState(false);

  const { execute: download, status } = useAction(downloadCertificatePdf, {
    onSuccess: ({ data }) => {
      if (data) downloadPdfFromBase64(data.fileName, data.base64);
    },
  });

  async function handleCopyHash() {
    try {
      await navigator.clipboard.writeText(certificate.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — sem feedback, código continua visível para cópia manual
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-md border border-(--border) bg-(--surface) p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--brand-muted)">
          <Award className="h-5 w-5 text-(--brand)" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="hb-eyebrow">Certificado de conclusão</p>
          <h3 className="font-(--font-display) text-base leading-snug text-(--fg)">
            {certificate.courseName}
          </h3>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-(--fg-muted)">Emitido para</dt>
          <dd className="truncate text-(--fg)">{certificate.userName}</dd>
        </div>
        <div>
          <dt className="text-xs text-(--fg-muted)">Data de emissão</dt>
          <dd className="text-(--fg)">{formatDate(certificate.issuedAt)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2 rounded-sm bg-(--surface-alt) px-3 py-2">
        <span className="min-w-0 truncate font-(--font-mono) text-xs text-(--fg-muted)">
          {certificate.hash}
        </span>
        <button
          type="button"
          onClick={handleCopyHash}
          aria-label="Copiar código de verificação"
          className="flex shrink-0 items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium text-(--brand) transition-colors hover:bg-(--surface)"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copiado" : "Copiar código"}
        </button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => download({ certificateId: certificate.id })}
        loading={status === "executing"}
        disabled={status === "executing"}
        leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
      >
        Baixar certificado
      </Button>
    </div>
  );
}
