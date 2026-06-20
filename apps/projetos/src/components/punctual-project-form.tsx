"use client";

import { useState, useRef } from "react";
import type { ProjectCategory } from "@hebron/types";
import type { Organization } from "@hebron/types";
import {
  ChevronDown,
  Check,
  Loader2,
  MapPin,
  Upload,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import { createPunctualProjectSchema } from "@hebron/validators";
import { mockOrganizations } from "../lib/mock-data";

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

const inputCls =
  "w-full rounded-[--radius] border px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand] focus-visible:border-transparent";
const inputStyle = {
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-alt)",
  color: "var(--fg)",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: ProjectCategory;
  label: string;
}> = [
  { value: "evangelismo", label: "Evangelismo" },
  { value: "missoes_transculturais", label: "Missões Transculturais" },
  { value: "educacao_crista", label: "Educação Cristã" },
  { value: "assistencia_social", label: "Assistência Social" },
  { value: "saude", label: "Saúde" },
  { value: "capacitacao_lideranca", label: "Capacitação de Liderança" },
  { value: "infraestrutura_ministerial", label: "Infraestrutura Ministerial" },
  { value: "plantacao_de_igrejas", label: "Plantação de Igrejas" },
  { value: "discipulado", label: "Discipulado" },
  { value: "outros", label: "Outros" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type PunctualFormData = {
  titulo: string;
  categoria: ProjectCategory | "";
  organizacaoId: string;
  valorTotal: number | "";
  motivoEmergencial: string;
  prazoNecessidade: string;
  descricao: string;
  beneficiariosQuantidade: number | "";
  regiao: string;
  pais: string;
};

type PunctualFormErrors = Partial<Record<keyof PunctualFormData, string>>;

const INITIAL: PunctualFormData = {
  titulo: "",
  categoria: "",
  organizacaoId: "",
  valorTotal: "",
  motivoEmergencial: "",
  prazoNecessidade: "",
  descricao: "",
  beneficiariosQuantidade: "",
  regiao: "",
  pais: "",
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(data: PunctualFormData): PunctualFormErrors {
  const errors: PunctualFormErrors = {};

  if (!data.titulo.trim() || data.titulo.trim().length < 5) {
    errors.titulo = "Título deve ter pelo menos 5 caracteres";
  }
  if (!data.categoria) {
    errors.categoria = "Selecione uma categoria";
  }
  if (!data.organizacaoId) {
    errors.organizacaoId = "Selecione uma instituição";
  }
  if (data.valorTotal === "" || (data.valorTotal as number) <= 0) {
    errors.valorTotal = "Informe um valor positivo";
  }
  if (data.motivoEmergencial.trim().length < 30) {
    errors.motivoEmergencial =
      "Descreva o motivo emergencial (mínimo 30 caracteres)";
  }
  if (!data.prazoNecessidade) {
    errors.prazoNecessidade = "Informe a data de necessidade";
  }

  return errors;
}

// ─── PunctualProjectForm ──────────────────────────────────────────────────────

interface PunctualProjectFormProps {
  organizations?: Organization[];
  editalId?: string;
  categoriaInicial?: string;
}

export function PunctualProjectForm({
  organizations = mockOrganizations,
  editalId: _editalId = "",
  categoriaInicial = "",
}: PunctualProjectFormProps) {
  const [data, setData] = useState<PunctualFormData>({
    ...INITIAL,
    categoria: (categoriaInicial as ProjectCategory | "") || "",
  });
  const [errors, setErrors] = useState<PunctualFormErrors>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function patch(updates: Partial<PunctualFormData>) {
    setData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const cleared = new Set(Object.keys(updates));
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => !cleared.has(k)),
      ) as PunctualFormErrors;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Double-check against schema (safe parse on the ZodObject)
    const parsed = createPunctualProjectSchema.safeParse({
      titulo: data.titulo,
      categoria: data.categoria,
      organizacaoId: data.organizacaoId,
      valorTotal: data.valorTotal === "" ? -1 : data.valorTotal,
      motivoEmergencial: data.motivoEmergencial,
      prazoNecessidade: data.prazoNecessidade
        ? new Date(data.prazoNecessidade).toISOString()
        : "",
      descricao: data.descricao || undefined,
      beneficiariosQuantidade:
        data.beneficiariosQuantidade === ""
          ? undefined
          : data.beneficiariosQuantidade,
      regiao: data.regiao || undefined,
      pais: data.pais || undefined,
    });

    if (!parsed.success) {
      const schemaErrors: PunctualFormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as keyof PunctualFormData;
        if (!schemaErrors[key]) schemaErrors[key] = issue.message;
      }
      setErrors(schemaErrors);
      return;
    }

    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 1000));
    setSubmitting(false);
    setSubmitted(true);
  }

  function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center gap-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--hb-green-muted)" }}
        >
          <Check
            className="w-8 h-8"
            style={{ color: "var(--hb-green)" }}
            aria-hidden
          />
        </div>
        <div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
          >
            Solicitação Enviada
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--fg-muted)" }}
          >
            Sua solicitação pontual foi enviada para análise. A diretoria será
            notificada imediatamente.
          </p>
          <p
            className="text-xs mt-5 italic"
            style={{ color: "var(--fg-subtle)" }}
          >
            "O Senhor é a minha força e o meu escudo." — Salmos 28:7
          </p>
        </div>
      </div>
    );
  }

  const selectedOrg = organizations.find((o) => o.id === data.organizacaoId);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Info banner */}
      <div
        className="rounded-[--radius] border px-4 py-3 text-sm"
        style={{
          borderColor: "var(--hb-orange)",
          backgroundColor: "var(--hb-orange-muted)",
          color: "var(--hb-orange-deep)",
        }}
      >
        <strong>Projeto Pontual</strong> — Para necessidades emergenciais.
        Avaliação mensal pela diretoria, pagamento único.
      </div>

      {/* 6 required fields */}

      {/* 1. Título */}
      <div>
        <Label htmlFor="p-titulo" required>
          Título da Solicitação
        </Label>
        <input
          id="p-titulo"
          type="text"
          value={data.titulo}
          onChange={(e) => patch({ titulo: e.target.value })}
          placeholder="Ex.: Apoio Emergencial — Comunidade Rio Solimões"
          className={inputCls}
          style={inputStyle}
          maxLength={200}
          aria-invalid={!!errors.titulo}
          aria-describedby={errors.titulo ? "titulo-error" : undefined}
        />
        <FieldError message={errors.titulo} />
      </div>

      {/* 2. Categoria */}
      <div>
        <Label htmlFor="p-categoria" required>
          Categoria
        </Label>
        <div className="relative">
          <select
            id="p-categoria"
            value={data.categoria}
            onChange={(e) =>
              patch({ categoria: e.target.value as typeof data.categoria })
            }
            className={`${inputCls} appearance-none pr-10`}
            style={inputStyle}
            aria-invalid={!!errors.categoria}
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden
          />
        </div>
        <FieldError message={errors.categoria} />
      </div>

      {/* 3. Organização */}
      <div>
        <Label htmlFor="p-org" required>
          Instituição
        </Label>
        <div className="relative">
          <select
            id="p-org"
            value={data.organizacaoId}
            onChange={(e) => patch({ organizacaoId: e.target.value })}
            className={`${inputCls} appearance-none pr-10`}
            style={inputStyle}
            aria-invalid={!!errors.organizacaoId}
          >
            <option value="" disabled>
              Selecione uma instituição
            </option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {o.country}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden
          />
        </div>
        {selectedOrg?.contactName && (
          <p
            className="text-xs mt-1.5 flex items-center gap-1"
            style={{ color: "var(--fg-muted)" }}
          >
            <MapPin className="w-3 h-3" aria-hidden />
            {[selectedOrg.city, selectedOrg.state, selectedOrg.country]
              .filter(Boolean)
              .join(", ")}
            {" · "}
            {selectedOrg.contactName}
          </p>
        )}
        <FieldError message={errors.organizacaoId} />
      </div>

      {/* 4. Valor total */}
      <div>
        <Label htmlFor="p-valor" required>
          Valor Total Necessário (R$)
        </Label>
        <input
          id="p-valor"
          type="number"
          min={0}
          step={100}
          value={data.valorTotal === "" ? "" : (data.valorTotal as number)}
          onChange={(e) =>
            patch({
              valorTotal: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          placeholder="Ex.: 12000"
          className={inputCls}
          style={inputStyle}
          aria-invalid={!!errors.valorTotal}
        />
        <FieldError message={errors.valorTotal} />
      </div>

      {/* 5. Motivo emergencial */}
      <div>
        <Label htmlFor="p-motivo" required>
          Motivo Emergencial
        </Label>
        <textarea
          id="p-motivo"
          value={data.motivoEmergencial}
          onChange={(e) => patch({ motivoEmergencial: e.target.value })}
          placeholder="Descreva a necessidade urgente que justifica este pedido pontual…"
          rows={4}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          maxLength={3000}
          aria-invalid={!!errors.motivoEmergencial}
        />
        <p
          className="text-[11px] mt-1 text-right"
          style={{ color: "var(--fg-muted)" }}
        >
          {data.motivoEmergencial.trim().length}/3000
        </p>
        <FieldError message={errors.motivoEmergencial} />
      </div>

      {/* 6. Prazo de necessidade */}
      <div>
        <Label htmlFor="p-prazo" required>
          Data de Necessidade
        </Label>
        <input
          id="p-prazo"
          type="date"
          value={data.prazoNecessidade}
          onChange={(e) => patch({ prazoNecessidade: e.target.value })}
          min={new Date().toISOString().split("T")[0]}
          className={inputCls}
          style={inputStyle}
          aria-invalid={!!errors.prazoNecessidade}
        />
        <p className="text-xs mt-1.5" style={{ color: "var(--fg-muted)" }}>
          Quando os recursos precisam estar disponíveis?
        </p>
        <FieldError message={errors.prazoNecessidade} />
      </div>

      {/* Optional fields */}
      <details className="group">
        <summary
          className="text-sm font-semibold cursor-pointer list-none flex items-center gap-2"
          style={{ color: "var(--fg-muted)" }}
        >
          <ChevronDown
            className="w-4 h-4 transition-transform group-open:rotate-180"
            aria-hidden
          />
          Informações adicionais (opcional)
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <Label htmlFor="p-descricao">Descrição Complementar</Label>
            <textarea
              id="p-descricao"
              value={data.descricao}
              onChange={(e) => patch({ descricao: e.target.value })}
              placeholder="Contexto adicional sobre a solicitação…"
              rows={3}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              maxLength={5000}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-regiao">Região</Label>
              <input
                id="p-regiao"
                type="text"
                value={data.regiao}
                onChange={(e) => patch({ regiao: e.target.value })}
                placeholder="Ex.: Nordeste"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <Label htmlFor="p-pais">País</Label>
              <input
                id="p-pais"
                type="text"
                value={data.pais}
                onChange={(e) => patch({ pais: e.target.value })}
                placeholder="Ex.: Brasil"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="p-beneficiarios">Nº de Beneficiários</Label>
            <input
              id="p-beneficiarios"
              type="number"
              min={1}
              value={
                data.beneficiariosQuantidade === ""
                  ? ""
                  : (data.beneficiariosQuantidade as number)
              }
              onChange={(e) =>
                patch({
                  beneficiariosQuantidade:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              placeholder="Ex.: 100"
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>
      </details>

      {/* Optional attachments */}
      <div>
        <p
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--fg)" }}
        >
          Anexos (opcional)
        </p>
        <div
          className="rounded-[--radius-md] border border-dashed py-5 flex flex-col items-center gap-2 cursor-pointer"
          style={{ borderColor: "var(--border)" }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Adicionar anexos"
        >
          <Upload
            className="w-5 h-5"
            style={{ color: "var(--fg-subtle)" }}
            aria-hidden
          />
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Clique para adicionar documentos de suporte
          </p>
          <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            PDF, imagem, planilha — qualquer formato aceito
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleAttachment}
          aria-label="Selecionar anexos"
        />

        {attachments.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {attachments.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-3 rounded-[--radius] border px-3 py-2"
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
                <span
                  className="flex-1 text-xs truncate"
                  style={{ color: "var(--fg)" }}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  aria-label={`Remover ${file.name}`}
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

      {/* Global errors */}
      {Object.keys(errors).length > 0 && (
        <div
          className="flex items-center gap-2 rounded-[--radius] border px-4 py-3"
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
        className="flex items-center justify-center gap-2 rounded-[--radius-md] py-3 text-sm font-semibold text-white transition-colors disabled:opacity-70"
        style={{ backgroundColor: "var(--hb-orange)" }}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Check className="w-4 h-4" aria-hidden />
        )}
        {submitting ? "Enviando…" : "Enviar Solicitação Pontual"}
      </button>
    </form>
  );
}
