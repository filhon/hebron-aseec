"use client";

import { useRef, useState } from "react";
import {
  Check,
  Loader2,
  Upload,
  FileText,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { createReportSchema } from "@hebron/validators";

// ─── Local primitives ─────────────────────────────────────────────────────────

function Label({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold mb-1.5"
      style={{ color: "var(--fg)" }}
    >
      {children}
      {required && (
        <span
          className="ml-0.5"
          style={{ color: "var(--color-destructive)" }}
          aria-hidden
        >
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="text-xs mt-1.5"
      style={{ color: "var(--color-destructive)" }}
      role="alert"
    >
      {message}
    </p>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-1.5" style={{ color: "var(--fg-muted)" }}>
      {children}
    </p>
  );
}

function CharCount({
  value,
  min,
  max,
}: {
  value: string;
  min: number;
  max: number;
}) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <p
      className="text-[11px] mt-1 text-right"
      style={{ color: ok ? "var(--fg-muted)" : "var(--color-destructive)" }}
    >
      {len}/{max}
    </p>
  );
}

const inputCls =
  "w-full rounded-(--radius) border px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:border-transparent";
const inputStyle = {
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-alt)",
  color: "var(--fg)",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportFormData = {
  projectId: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  narrativa: string;
  resultadosAlcancados: string;
  dificuldades: string;
  proximosPassos: string;
  beneficiariosAtingidos: number | "";
};

type ReportFormErrors = Partial<Record<keyof ReportFormData, string>>;

type AttachmentEntry = {
  file: File;
  id: string;
};

// ─── Period helpers ───────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const PERIOD_OPTIONS = [
  `${CURRENT_YEAR}-Q1`,
  `${CURRENT_YEAR}-Q2`,
  `${CURRENT_YEAR}-Q3`,
  `${CURRENT_YEAR}-Q4`,
  `${CURRENT_YEAR - 1}-Q1`,
  `${CURRENT_YEAR - 1}-Q2`,
  `${CURRENT_YEAR - 1}-Q3`,
  `${CURRENT_YEAR - 1}-Q4`,
];

function periodToDates(period: string): { start: string; end: string } {
  const match = /^(\d{4})-Q([1-4])$/.exec(period);
  if (!match) return { start: "", end: "" };
  const year = parseInt(match[1] ?? "0");
  const q = parseInt(match[2] ?? "0");
  const starts = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
  const startMonth = starts[0] ?? 1;
  const endMonth = starts[2] ?? 3;
  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year, endMonth, 0); // last day of end month
  return {
    start: startDate.toISOString().split("T")[0] ?? "",
    end: endDate.toISOString().split("T")[0] ?? "",
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(data: ReportFormData): ReportFormErrors {
  const errors: ReportFormErrors = {};

  if (!data.projectId) errors.projectId = "ID do projeto inválido";
  if (!/^\d{4}-Q[1-4]$/.test(data.period)) {
    errors.period = "Selecione um período válido";
  }
  if (!data.periodStart) errors.periodStart = "Informe a data de início";
  if (!data.periodEnd) errors.periodEnd = "Informe a data de fim";
  if (data.narrativa.trim().length < 100) {
    errors.narrativa = "Narrativa deve ter pelo menos 100 caracteres";
  }
  if (data.resultadosAlcancados.trim().length < 50) {
    errors.resultadosAlcancados =
      "Resultados devem ter pelo menos 50 caracteres";
  }
  if (data.beneficiariosAtingidos === "") {
    errors.beneficiariosAtingidos =
      "Informe o número de beneficiários atingidos";
  } else if ((data.beneficiariosAtingidos as number) < 0) {
    errors.beneficiariosAtingidos = "Número inválido";
  }

  return errors;
}

// ─── ReportForm ───────────────────────────────────────────────────────────────

interface ReportFormProps {
  projectId: string;
  projectTitle?: string;
  onSuccess?: () => void;
}

export function ReportForm({
  projectId,
  projectTitle,
  onSuccess,
}: ReportFormProps) {
  const [data, setData] = useState<ReportFormData>({
    projectId,
    period: "",
    periodStart: "",
    periodEnd: "",
    narrativa: "",
    resultadosAlcancados: "",
    dificuldades: "",
    proximosPassos: "",
    beneficiariosAtingidos: "",
  });
  const [errors, setErrors] = useState<ReportFormErrors>({});
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function patch(updates: Partial<ReportFormData>) {
    setData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const cleared = new Set(Object.keys(updates));
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => !cleared.has(k)),
      ) as ReportFormErrors;
    });
  }

  function handlePeriodChange(period: string) {
    const { start, end } = periodToDates(period);
    patch({ period, periodStart: start, periodEnd: end });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const entries: AttachmentEntry[] = files.map((f) => ({
      file: f,
      id: `${f.name}-${f.size}-${Date.now()}`,
    }));
    setAttachments((prev) => [...prev, ...entries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Schema check with converted types
    const parsed = createReportSchema.safeParse({
      projectId: data.projectId,
      period: data.period,
      periodStart: data.periodStart
        ? new Date(data.periodStart).toISOString()
        : "",
      periodEnd: data.periodEnd ? new Date(data.periodEnd).toISOString() : "",
      narrativa: data.narrativa,
      resultadosAlcancados: data.resultadosAlcancados,
      dificuldades: data.dificuldades || undefined,
      proximosPassos: data.proximosPassos || undefined,
      beneficiariosAtingidos:
        data.beneficiariosAtingidos === "" ? 0 : data.beneficiariosAtingidos,
      attachmentKeys: attachments.map((a) => ({
        storageKey: `reports/${projectId}/${a.file.name}`,
        fileName: a.file.name,
        fileSizeBytes: a.file.size,
        mimeType: a.file.type || "application/octet-stream",
      })),
    });

    if (!parsed.success) {
      const schemaErrors: ReportFormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as keyof ReportFormData;
        if (!schemaErrors[key]) schemaErrors[key] = issue.message;
      }
      setErrors(schemaErrors);
      return;
    }

    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 1000));
    setSubmitting(false);
    setSubmitted(true);
    onSuccess?.();
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-10">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--hb-green-muted)" }}
        >
          <Check
            className="w-7 h-7"
            style={{ color: "var(--hb-green)" }}
            aria-hidden
          />
        </div>
        <div>
          <h2
            className="text-xl font-bold mb-1.5"
            style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
          >
            Relatório Enviado
          </h2>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Seu relatório foi registrado com sucesso e está disponível para
            revisão da diretoria.
          </p>
          <p
            className="text-xs mt-4 italic"
            style={{ color: "var(--fg-subtle)" }}
          >
            "Seja fiel em pequenas coisas, pois é nelas que sua força reside."
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {projectTitle && (
        <div
          className="rounded-(--radius) border px-4 py-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-alt)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
            Projeto
          </p>
          <p
            className="text-sm font-semibold mt-0.5"
            style={{ color: "var(--fg)" }}
          >
            {projectTitle}
          </p>
        </div>
      )}

      {/* Period */}
      <div>
        <Label htmlFor="r-period" required>
          Período de Referência
        </Label>
        <div className="relative">
          <select
            id="r-period"
            value={data.period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className={`${inputCls} appearance-none pr-10`}
            style={inputStyle}
            aria-invalid={!!errors.period}
          >
            <option value="" disabled>
              Selecione o trimestre
            </option>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden
          />
        </div>
        <FieldError message={errors.period} />
      </div>

      {/* Period dates (auto-filled from period) */}
      {data.period && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="r-start" required>
              Data de Início
            </Label>
            <input
              id="r-start"
              type="date"
              value={data.periodStart}
              onChange={(e) => patch({ periodStart: e.target.value })}
              className={inputCls}
              style={inputStyle}
              aria-invalid={!!errors.periodStart}
            />
            <FieldError message={errors.periodStart} />
          </div>
          <div>
            <Label htmlFor="r-end" required>
              Data de Fim
            </Label>
            <input
              id="r-end"
              type="date"
              value={data.periodEnd}
              onChange={(e) => patch({ periodEnd: e.target.value })}
              className={inputCls}
              style={inputStyle}
              aria-invalid={!!errors.periodEnd}
            />
            <FieldError message={errors.periodEnd} />
          </div>
        </div>
      )}

      {/* Beneficiários atingidos */}
      <div>
        <Label htmlFor="r-beneficiarios" required>
          Beneficiários Atingidos
        </Label>
        <input
          id="r-beneficiarios"
          type="number"
          min={0}
          value={
            data.beneficiariosAtingidos === ""
              ? ""
              : (data.beneficiariosAtingidos as number)
          }
          onChange={(e) =>
            patch({
              beneficiariosAtingidos:
                e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          placeholder="Ex.: 350"
          className={inputCls}
          style={inputStyle}
          aria-invalid={!!errors.beneficiariosAtingidos}
        />
        <FieldHint>
          Número de pessoas efetivamente alcançadas no período.
        </FieldHint>
        <FieldError message={errors.beneficiariosAtingidos} />
      </div>

      <hr style={{ borderColor: "var(--border)" }} />

      {/* Narrativa */}
      <div>
        <Label htmlFor="r-narrativa" required>
          Narrativa do Período
        </Label>
        <textarea
          id="r-narrativa"
          value={data.narrativa}
          onChange={(e) => patch({ narrativa: e.target.value })}
          placeholder="Descreva em detalhes o que foi realizado durante o período, as atividades desenvolvidas, os desafios enfrentados e as vitórias alcançadas…"
          rows={6}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          maxLength={10000}
          aria-invalid={!!errors.narrativa}
        />
        <CharCount value={data.narrativa} min={100} max={10000} />
        <FieldError message={errors.narrativa} />
      </div>

      {/* Resultados alcançados */}
      <div>
        <Label htmlFor="r-resultados" required>
          Resultados Alcançados
        </Label>
        <textarea
          id="r-resultados"
          value={data.resultadosAlcancados}
          onChange={(e) => patch({ resultadosAlcancados: e.target.value })}
          placeholder="Liste os resultados concretos e mensuráveis alcançados neste período…"
          rows={4}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          maxLength={5000}
          aria-invalid={!!errors.resultadosAlcancados}
        />
        <CharCount value={data.resultadosAlcancados} min={50} max={5000} />
        <FieldError message={errors.resultadosAlcancados} />
      </div>

      {/* Dificuldades (optional) */}
      <div>
        <Label htmlFor="r-dificuldades">Dificuldades Encontradas</Label>
        <textarea
          id="r-dificuldades"
          value={data.dificuldades}
          onChange={(e) => patch({ dificuldades: e.target.value })}
          placeholder="Quais obstáculos foram encontrados? Como foram enfrentados? (opcional)"
          rows={3}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          maxLength={3000}
        />
      </div>

      {/* Próximos passos (optional) */}
      <div>
        <Label htmlFor="r-proximos">Próximos Passos</Label>
        <textarea
          id="r-proximos"
          value={data.proximosPassos}
          onChange={(e) => patch({ proximosPassos: e.target.value })}
          placeholder="O que está planejado para o próximo período? (opcional)"
          rows={3}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          maxLength={3000}
        />
      </div>

      {/* Attachments */}
      <div>
        <p
          className="text-sm font-semibold mb-2"
          style={{ color: "var(--fg)" }}
        >
          Anexos
          <span
            className="ml-1.5 text-xs font-normal"
            style={{ color: "var(--fg-muted)" }}
          >
            — fotos, recibos, notas fiscais, etc.
          </span>
        </p>

        <div
          className="rounded-md border border-dashed py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors"
          style={{ borderColor: "var(--border)" }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Adicionar anexos ao relatório"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--hb-blue)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--border)";
          }}
        >
          <Upload
            className="w-5 h-5"
            style={{ color: "var(--fg-subtle)" }}
            aria-hidden
          />
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Arraste ou clique para adicionar
          </p>
          <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            PDF, JPG, PNG, XLSX — múltiplos arquivos permitidos
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/*,.xlsx,.xls,.doc,.docx"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Selecionar anexos"
        />

        {attachments.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {attachments.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-(--radius) border px-3 py-2"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-alt)",
                }}
              >
                <FileText
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--hb-blue)" }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: "var(--fg)" }}
                  >
                    {entry.file.name}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {formatBytes(entry.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(entry.id)}
                  aria-label={`Remover ${entry.file.name}`}
                  className="shrink-0 transition-colors"
                  style={{ color: "var(--fg-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--color-destructive)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--fg-muted)";
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global error */}
      {Object.keys(errors).length > 0 && (
        <div
          className="flex items-center gap-2 rounded-(--radius) border px-4 py-3"
          style={{
            borderColor: "var(--color-destructive)",
            backgroundColor: "var(--color-destructive-muted)",
          }}
        >
          <AlertCircle
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--color-destructive)" }}
            aria-hidden
          />
          <p className="text-sm" style={{ color: "var(--color-destructive)" }}>
            Corrija os campos destacados antes de enviar.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold transition-colors disabled:opacity-70"
        style={{
          backgroundColor: "var(--brand)",
          color: "var(--brand-fg)",
        }}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Check className="w-4 h-4" aria-hidden />
        )}
        {submitting ? "Enviando relatório…" : "Enviar Relatório"}
      </button>
    </form>
  );
}
