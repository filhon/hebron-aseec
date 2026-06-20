"use client";

import type { Organization, ProjectCategory } from "@hebron/types";
import { Edit2, FileText, Video, FileSpreadsheet, Check } from "lucide-react";
import type { WizardFormData, WizardFiles } from "../project-wizard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  evangelismo: "Evangelismo",
  missoes_transculturais: "Missões Transculturais",
  educacao_crista: "Educação Cristã",
  assistencia_social: "Assistência Social",
  saude: "Saúde",
  capacitacao_lideranca: "Capacitação de Liderança",
  infraestrutura_ministerial: "Infraestrutura Ministerial",
  plantacao_de_igrejas: "Plantação de Igrejas",
  discipulado: "Discipulado",
  outros: "Outros",
};

const MONTH_ABBR = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── ReviewSection ────────────────────────────────────────────────────────────

interface ReviewRow {
  label: string;
  value: React.ReactNode;
  long?: boolean;
}

function ReviewSection({
  title,
  step,
  rows,
  onEdit,
}: {
  title: string;
  step: number;
  rows: ReviewRow[];
  onEdit: (step: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--brand)" }}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: "var(--fg-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--hb-blue)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)";
          }}
          aria-label={`Editar ${title}`}
        >
          <Edit2 className="w-3 h-3" aria-hidden />
          Editar
        </button>
      </div>
      <div
        className="rounded-[--radius-md] border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={`px-4 py-3 ${row.long ? "flex flex-col gap-1" : "flex items-start justify-between gap-4"}`}
            style={{
              borderTop: idx > 0 ? "1px solid var(--border)" : "none",
              backgroundColor: "var(--surface)",
            }}
          >
            <span
              className="text-sm shrink-0"
              style={{
                color: "var(--fg-muted)",
                minWidth: row.long ? undefined : "120px",
              }}
            >
              {row.label}
            </span>
            <span
              className="text-sm font-medium text-right"
              style={{ color: "var(--fg)" }}
            >
              {row.value ?? (
                <span
                  style={{ color: "var(--fg-subtle)", fontStyle: "italic" }}
                >
                  Não informado
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── StepReview ───────────────────────────────────────────────────────────────

interface ReviewStepProps {
  data: WizardFormData;
  files: WizardFiles;
  organizations: Organization[];
  onJumpTo: (step: number) => void;
}

export function StepReview({
  data,
  files,
  organizations,
  onJumpTo,
}: ReviewStepProps) {
  const org = organizations.find((o) => o.id === data.organizacaoId);
  const total = data.valorTotal === "" ? 0 : (data.valorTotal as number);
  const porParcela =
    total > 0 && data.numeroParcelas > 0 ? total / data.numeroParcelas : 0;
  const mesesStr =
    data.mesesPagamento.length > 0
      ? data.mesesPagamento.map((m) => MONTH_ABBR[m - 1]).join(", ")
      : "—";
  const categoria = data.categoria
    ? CATEGORY_LABELS[data.categoria as ProjectCategory]
    : "—";

  const attachmentsCount = [
    files.video,
    files.spreadsheet,
    files.letter,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div
        className="rounded-[--radius] border px-4 py-3 text-sm font-medium"
        style={{
          borderColor: "var(--hb-blue)",
          backgroundColor: "var(--hb-gray-50)",
          color: "var(--hb-blue)",
        }}
      >
        Revise todas as informações antes de submeter. Após a submissão, o
        projeto não poderá ser editado sem aprovação da diretoria.
      </div>

      {/* Instituição */}
      <ReviewSection
        title="Instituição"
        step={1}
        onEdit={onJumpTo}
        rows={[
          {
            label: "Organização",
            value: org ? (
              <span>
                {org.name}
                <span
                  className="block text-xs font-normal"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {[org.city, org.state, org.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </span>
            ) : (
              "—"
            ),
          },
          { label: "Responsável", value: org?.contactName ?? "—" },
        ]}
      />

      {/* Proposta */}
      <ReviewSection
        title="Proposta"
        step={2}
        onEdit={onJumpTo}
        rows={[
          { label: "Título", value: data.titulo || "—" },
          { label: "Categoria", value: categoria },
          {
            label: "Localização",
            value:
              data.regiao || data.pais ? `${data.regiao}, ${data.pais}` : "—",
          },
          {
            label: "Beneficiários",
            value:
              data.beneficiariosQuantidade !== ""
                ? `${(data.beneficiariosQuantidade as number).toLocaleString("pt-BR")} pessoas`
                : "—",
          },
          {
            label: "Tempo no ministério",
            value:
              data.tempoMinisterioAnos !== ""
                ? `${data.tempoMinisterioAnos} anos`
                : "—",
          },
          {
            label: "Objetivos",
            value: data.objetivos
              ? data.objetivos.substring(0, 120) +
                (data.objetivos.length > 120 ? "…" : "")
              : "—",
            long: true,
          },
        ]}
      />

      {/* Orçamento */}
      <ReviewSection
        title="Orçamento"
        step={3}
        onEdit={onJumpTo}
        rows={[
          { label: "Ano de referência", value: String(data.anoReferencia) },
          {
            label: "Valor total",
            value: total > 0 ? BRL.format(total) : "—",
          },
          {
            label: "Parcelas",
            value:
              porParcela > 0
                ? `${data.numeroParcelas}× de ${BRL.format(porParcela)}`
                : `${data.numeroParcelas}×`,
          },
          { label: "Meses de pagamento", value: mesesStr },
          {
            label: "Cofinanciamento",
            value: data.cofinancimento || "Nenhum informado",
          },
        ]}
      />

      {/* Anexos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--brand)" }}
          >
            Anexos
          </p>
          <button
            type="button"
            onClick={() => onJumpTo(4)}
            className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: "var(--fg-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--hb-blue)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)";
            }}
            aria-label="Editar Anexos"
          >
            <Edit2 className="w-3 h-3" aria-hidden />
            Editar
          </button>
        </div>
        <div
          className="rounded-[--radius-md] border overflow-hidden"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          {[
            { icon: Video, label: "Vídeo de apresentação", file: files.video },
            {
              icon: FileSpreadsheet,
              label: "Planilha de orçamento",
              file: files.spreadsheet,
            },
            {
              icon: FileText,
              label: "Carta de recomendação",
              file: files.letter,
            },
          ].map(({ icon: Icon, label, file }, idx) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderTop: idx > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{
                  color: file ? "var(--hb-blue)" : "var(--fg-subtle)",
                }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm"
                  style={{ color: file ? "var(--fg)" : "var(--fg-muted)" }}
                >
                  {label}
                </p>
                {file && (
                  <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    {file.name} · {formatBytes(file.size)}
                  </p>
                )}
              </div>
              {file ? (
                <Check
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--hb-green)" }}
                  aria-hidden
                />
              ) : (
                <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                  Não enviado
                </span>
              )}
            </div>
          ))}
        </div>
        {attachmentsCount === 0 && (
          <p className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>
            Nenhum anexo adicionado. A carta de recomendação é obrigatória.
          </p>
        )}
      </div>

      {/* Declaration */}
      <div
        className="rounded-[--radius-md] border px-4 py-4"
        style={{
          borderColor: "var(--hb-green-deep)",
          backgroundColor: "var(--hb-green-muted)",
        }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--hb-green-fg)" }}
        >
          Ao submeter este projeto, declaro que todas as informações fornecidas
          são verdadeiras e que a instituição está em conformidade com os
          requisitos da Hebron Aseec.
        </p>
      </div>
    </div>
  );
}
