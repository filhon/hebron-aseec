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
    <li className="docs-ver-item">
      <span
        className={`docs-ver-dot${isCurrent ? " current" : ""}`}
        aria-hidden="true"
      />

      <div className={`docs-ver-card${isCurrent ? " current" : ""}`}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="docs-ver-trigger"
          aria-expanded={expanded}
        >
          <span className={`docs-ver-badge${isCurrent ? " current" : ""}`}>
            v{version.version}
          </span>

          <span className="docs-ver-notes">
            <span
              className={`docs-ver-notes-title${isCurrent ? " current" : ""}`}
            >
              {version.notes ?? `Versão ${version.version}`}
            </span>
            <span className="docs-ver-date">
              <Clock size={11} aria-hidden="true" />
              {formatDate(version.publishedAt)}
            </span>
          </span>

          {isCurrent && (
            <span className="docs-ver-current-badge">
              <CheckCircle2 size={13} aria-hidden="true" />
              Atual
            </span>
          )}

          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`docs-ver-chevron${expanded ? " open" : ""}`}
          />
        </button>

        {expanded && (
          <div className="docs-ver-details">
            <div className="docs-ver-diff">
              <div className="docs-ver-diff-header">
                <span className="docs-ver-diff-label">{diffCfg.label}</span>
                <span className="docs-ver-diff-size">
                  <FileText size={11} aria-hidden="true" />
                  {formatBytes(version.fileSizeBytes)}
                </span>
              </div>
              <div
                className="docs-ver-diff-track"
                role="meter"
                aria-label={diffCfg.label}
              >
                <div
                  className="docs-ver-diff-fill"
                  style={{
                    width: diffCfg.barWidth,
                    backgroundColor: diffCfg.color,
                  }}
                />
              </div>
            </div>

            <dl className="docs-ver-meta">
              <dt>
                <Hash size={11} aria-hidden="true" /> Versão
              </dt>
              <dd>v{version.version}</dd>

              <dt>
                <FileText size={11} aria-hidden="true" /> Formato
              </dt>
              <dd style={{ textTransform: "uppercase", fontSize: 11 }}>
                {version.mimeType.split("/")[1] ?? version.mimeType}
              </dd>

              <dt>
                <FileText size={11} aria-hidden="true" /> Tamanho
              </dt>
              <dd>{formatBytes(version.fileSizeBytes)}</dd>
            </dl>

            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(version)}
                className="hb-btn hb-btn-secondary hb-btn-sm"
                style={{ alignSelf: "flex-start" }}
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
    <div className={className}>
      <p className="hb-section-label docs-ver-count">
        {sorted.length} {sorted.length === 1 ? "versão" : "versões"}
      </p>

      <ul className="docs-ver-list" aria-label="Histórico de versões">
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
