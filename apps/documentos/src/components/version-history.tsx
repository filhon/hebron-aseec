"use client";

import { useState } from "react";
import {
  Download,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
} from "lucide-react";
import type { DocumentVersion } from "@hebron/types/documentos";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

type DiffMagnitude = "initial" | "minor" | "moderate" | "major";

interface DiffConfig {
  label: string;
  color: string;
  barWidth: string;
}

const DIFF_CONFIG: Record<DiffMagnitude, DiffConfig> = {
  initial: {
    label: "Versão inicial",
    color: "var(--hb-cyan)",
    barWidth: "100%",
  },
  minor: {
    label: "Alterações menores",
    color: "var(--hb-green)",
    barWidth: "33%",
  },
  moderate: {
    label: "Revisão moderada",
    color: "var(--hb-orange)",
    barWidth: "66%",
  },
  major: {
    label: "Revisão significativa",
    color: "var(--hb-red)",
    barWidth: "100%",
  },
};

function getDiffMagnitude(
  version: DocumentVersion,
  prevVersion: DocumentVersion | undefined,
): DiffMagnitude {
  if (!prevVersion) return "initial";
  const ratio =
    Math.abs(version.fileSizeBytes - prevVersion.fileSizeBytes) /
    prevVersion.fileSizeBytes;
  if (ratio < 0.05) return "minor";
  if (ratio < 0.2) return "moderate";
  return "major";
}

interface VersionRowProps {
  version: DocumentVersion;
  prevVersion: DocumentVersion | undefined;
  isCurrent: boolean;
  onDownload?: (version: DocumentVersion) => void;
}

function VersionRow({
  version,
  prevVersion,
  isCurrent,
  onDownload,
}: VersionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const diff = getDiffMagnitude(version, prevVersion);
  const diffCfg = DIFF_CONFIG[diff];

  return (
    <li className="relative">
      {/* Timeline dot */}
      <span
        className={[
          "absolute left-0 top-4.5 w-3 h-3 rounded-full border-2 border-[--surface] z-10",
          isCurrent ? "bg-[--brand]" : "bg-[--hb-gray-200]",
        ].join(" ")}
        aria-hidden="true"
      />

      <div
        className={[
          "ml-6 rounded-[--radius-sm] border transition-all duration-[--dur-fast]",
          isCurrent
            ? "border-[--brand] bg-[--brand-muted]"
            : "border-[--border] bg-[--surface] hover:border-[--hb-gray-200]",
        ].join(" ")}
      >
        {/* Version header */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
          aria-expanded={expanded}
        >
          {/* Version badge */}
          <span
            className={[
              "shrink-0 font-[--font-display] text-[13px] font-bold px-2.5 py-1 rounded-full",
              isCurrent
                ? "bg-[--brand] text-[--brand-fg]"
                : "bg-[--bg-alt] text-[--fg-muted] border border-[--border]",
            ].join(" ")}
          >
            v{version.version}
          </span>

          {/* Notes */}
          <span className="flex-1 min-w-0">
            <span
              className={[
                "text-[13.5px] font-semibold block truncate",
                isCurrent ? "text-[--brand]" : "text-[--fg]",
              ].join(" ")}
            >
              {version.notes ?? `Versão ${version.version}`}
            </span>
            <span className="text-[12px] text-[--fg-muted] inline-flex items-center gap-1 mt-0.5">
              <Clock size={11} aria-hidden="true" />
              {formatDate(version.publishedAt)}
            </span>
          </span>

          {/* Current badge */}
          {isCurrent && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[--brand]">
              <CheckCircle2 size={13} aria-hidden="true" />
              Atual
            </span>
          )}

          {/* Expand icon */}
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`shrink-0 text-[--fg-muted] transition-transform duration-[--dur-fast] ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-[--divider] pt-3 flex flex-col gap-3">
            {/* Diff visual */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[--fg-muted] font-medium">
                  {diffCfg.label}
                </span>
                <span className="text-[11.5px] text-[--fg-muted] inline-flex items-center gap-1">
                  <FileText size={11} aria-hidden="true" />
                  {formatBytes(version.fileSizeBytes)}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full bg-[--border] overflow-hidden"
                role="meter"
                aria-label={diffCfg.label}
              >
                <div
                  className="h-full rounded-full transition-all duration-[--dur-slow]"
                  style={{
                    width: diffCfg.barWidth,
                    backgroundColor: diffCfg.color,
                  }}
                />
              </div>
            </div>

            {/* Meta */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
              <dt className="text-[--fg-muted] inline-flex items-center gap-1">
                <Hash size={11} aria-hidden="true" />
                Versão
              </dt>
              <dd className="text-[--fg] font-medium">v{version.version}</dd>

              <dt className="text-[--fg-muted] inline-flex items-center gap-1">
                <FileText size={11} aria-hidden="true" />
                Formato
              </dt>
              <dd className="text-[--fg] font-medium uppercase text-[11px]">
                {version.mimeType.split("/")[1] ?? version.mimeType}
              </dd>

              <dt className="text-[--fg-muted] inline-flex items-center gap-1">
                <FileText size={11} aria-hidden="true" />
                Tamanho
              </dt>
              <dd className="text-[--fg] font-medium">
                {formatBytes(version.fileSizeBytes)}
              </dd>
            </dl>

            {/* Download */}
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(version)}
                className="hb-btn hb-btn-secondary hb-btn-sm self-start"
              >
                <Download size={13} aria-hidden="true" />
                Baixar v{version.version}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export interface VersionHistoryProps {
  versions: DocumentVersion[];
  currentVersionId: string | null;
  onDownload?: (version: DocumentVersion) => void;
  className?: string;
}

export function VersionHistory({
  versions,
  currentVersionId,
  onDownload,
  className = "",
}: VersionHistoryProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  if (sorted.length === 0) {
    return (
      <div className={`hb-empty ${className}`}>
        <div className="hb-empty-icon">
          <FileText size={24} aria-hidden="true" />
        </div>
        <b>Sem versões</b>
        <p className="hb-empty-body">
          Este documento ainda não possui versões publicadas.
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <p className="hb-section-label mb-3">
        {sorted.length} {sorted.length === 1 ? "versão" : "versões"}
      </p>

      {/* Timeline */}
      <ul
        className="relative pl-3 border-l-2 border-[--border] space-y-3"
        aria-label="Histórico de versões"
      >
        {sorted.map((version, index) => {
          const prevVersion = sorted[index + 1];
          return (
            <VersionRow
              key={version.id}
              version={version}
              prevVersion={prevVersion}
              isCurrent={version.id === currentVersionId}
              onDownload={onDownload}
            />
          );
        })}
      </ul>
    </div>
  );
}
