"use client";

import { useState, useRef, useCallback, useId, useEffect } from "react";
import { z } from "zod";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Info,
  Plus,
  Tag as TagIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Category, Tag } from "@hebron/types/documentos";
import { CategoryTree } from "./category-tree";
import { MarkdownEditor } from "./markdown-editor";

// ─── Types ────────────────────────────────────────────────────────────────────

type Visibility = "public" | "internal" | "restricted";
type ContentMode = "markdown" | "pdf";
type CycleType = "pontual" | "anual";

interface FaqItem {
  q: string;
  a: string;
}

export interface EditalFormValues {
  title: string;
  slug: string;
  description: string;
  visibility: Visibility;
  categoryId: string;
  tagIds: string[];
  /** Tags criadas localmente (ids `local-*` em tagIds) ainda não persistidas. */
  newTags: Tag[];
  content: string;
  contentMode: ContentMode;
  file: File | null;
  cycleType: CycleType;
  opensAt: string;
  closesAt: string;
  projectType: string;
  projectCategory: string;
  faqItems: FaqItem[];
}

type FormErrors = Partial<
  Record<keyof EditalFormValues | "faqItems_q" | "faqItems_a", string>
>;

// ─── Validation ───────────────────────────────────────────────────────────────

const editalFormSchema = z
  .object({
    title: z
      .string()
      .min(3, "Título deve ter pelo menos 3 caracteres")
      .max(200, "Título deve ter no máximo 200 caracteres"),
    description: z
      .string()
      .max(1000, "Descrição deve ter no máximo 1000 caracteres"),
    categoryId: z.string().min(1, "Selecione uma categoria válida"),
    content: z.string(),
    contentMode: z.enum(["markdown", "pdf"]),
    cycleType: z.enum(["pontual", "anual"]),
    opensAt: z.string(),
    closesAt: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.contentMode === "markdown" && !data.content.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Insira o conteúdo do edital",
      });
    }
    if (data.cycleType === "anual") {
      if (!data.opensAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["opensAt"],
          message: "Data de abertura obrigatória para editais anuais",
        });
      }
      if (!data.closesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closesAt"],
          message: "Data de fechamento obrigatória para editais anuais",
        });
      }
      if (data.opensAt && data.closesAt && data.opensAt >= data.closesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closesAt"],
          message: "Data de fechamento deve ser posterior à data de abertura",
        });
      }
    }
  });

function validate(
  values: EditalFormValues,
  hasExistingFile: boolean,
): FormErrors {
  const result = editalFormSchema.safeParse(values);
  const errors: FormErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormErrors;
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }
  if (values.contentMode === "pdf" && !values.file && !hasExistingFile) {
    errors.file = "Selecione um arquivo PDF";
  }
  return errors;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function formatBytes(bytes: number): string {
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message, id }: { message: string; id?: string }) {
  return (
    <span
      id={id}
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11.5,
        color: "var(--hb-red)",
        marginTop: 4,
      }}
    >
      <AlertCircle size={11} aria-hidden="true" />
      {message}
    </span>
  );
}

const VISIBILITY_OPTIONS = [
  {
    value: "public" as const,
    label: "Público",
    desc: "Visível para qualquer pessoa no portal.",
  },
  {
    value: "internal" as const,
    label: "Interno",
    desc: "Visível apenas para colaboradores autenticados.",
  },
  {
    value: "restricted" as const,
    label: "Restrito",
    desc: "Visível somente para super_admin e diretoria.",
  },
] as const;

const PROJECT_TYPES = [
  { value: "", label: "Sem vínculo" },
  { value: "missionario", label: "Missionário" },
  { value: "educacional", label: "Educacional" },
  { value: "assistencia_social", label: "Assistência social" },
  { value: "saude", label: "Saúde" },
  { value: "outro", label: "Outro" },
];

const PROJECT_CATEGORIES = [
  { value: "", label: "Sem vínculo" },
  { value: "evangelizacao", label: "Evangelização" },
  { value: "capacitacao-lideranca", label: "Capacitação de liderança" },
  { value: "vulnerabilidade", label: "Vulnerabilidade social" },
  { value: "missoes-transculturais", label: "Missões transculturais" },
  { value: "outro", label: "Outro" },
];

// ─── Main component ────────────────────────────────────────────────────────────

export interface EditalFormProps {
  categories?: Category[];
  availableTags?: Tag[];
  initialValues?: Partial<EditalFormValues>;
  onSubmit: (values: EditalFormValues) => void;
  onSaveDraft?: (values: Partial<EditalFormValues>) => void;
  mode?: "create" | "edit";
  /** Em modo de edição, indica que já existe um PDF salvo (mantém-se se nenhum novo arquivo for enviado). */
  hasExistingFile?: boolean;
  isLoading?: boolean;
}

export function EditalForm({
  categories = [],
  availableTags = [],
  initialValues,
  onSubmit,
  onSaveDraft,
  mode = "create",
  hasExistingFile = false,
  isLoading = false,
}: EditalFormProps) {
  const titleId = useId();
  const descId = useId();
  const contentId = useId();

  const [values, setValues] = useState<EditalFormValues>({
    title: initialValues?.title ?? "",
    slug: initialValues?.slug ?? "",
    description: initialValues?.description ?? "",
    visibility: initialValues?.visibility ?? "public",
    categoryId: initialValues?.categoryId ?? "",
    tagIds: initialValues?.tagIds ?? [],
    newTags: [],
    content: initialValues?.content ?? "",
    contentMode: initialValues?.contentMode ?? "markdown",
    file: initialValues?.file ?? null,
    cycleType: initialValues?.cycleType ?? "anual",
    opensAt: initialValues?.opensAt ?? "",
    closesAt: initialValues?.closesAt ?? "",
    projectType: initialValues?.projectType ?? "",
    projectCategory: initialValues?.projectCategory ?? "",
    faqItems: initialValues?.faqItems ?? [{ q: "", a: "" }],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const file = values.file;
    if (!file) {
      setPdfUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [values.file]);

  const set = useCallback(
    <K extends keyof EditalFormValues>(key: K, val: EditalFormValues[K]) => {
      setValues((prev) => {
        const next = { ...prev, [key]: val };
        if (key === "title") {
          next.slug = toSlug(String(val));
        }
        return next;
      });
      if (touched.has(key)) {
        setErrors(
          (prev) =>
            Object.fromEntries(
              Object.entries(prev).filter(([k]) => k !== key),
            ) as FormErrors,
        );
      }
    },
    [touched],
  );

  const blur = useCallback((key: string) => {
    setTouched((prev) => new Set(prev).add(key));
  }, []);

  // Tag helpers
  const allTags = [...availableTags, ...localTags];
  const selectedTags = allTags.filter((t) => values.tagIds.includes(t.id));
  const tagSuggestions = allTags.filter(
    (t) =>
      !values.tagIds.includes(t.id) &&
      t.name.toLowerCase().includes(tagInput.toLowerCase()),
  );
  const canCreateTag =
    tagInput.trim().length > 0 &&
    !allTags.some(
      (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase(),
    );

  function addTag(tag: Tag) {
    set("tagIds", [...values.tagIds, tag.id]);
    setTagInput("");
    setShowTagSuggestions(false);
  }

  function removeTag(id: string) {
    set(
      "tagIds",
      values.tagIds.filter((tid) => tid !== id),
    );
  }

  function createTag() {
    const name = tagInput.trim();
    if (!name) return;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const newTag: Tag = { id: `local-${Date.now()}`, name, slug, color: null };
    setLocalTags((prev) => [...prev, newTag]);
    set("tagIds", [...values.tagIds, newTag.id]);
    setTagInput("");
    setShowTagSuggestions(false);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const existing = allTags.find(
        (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase(),
      );
      if (existing) {
        addTag(existing);
      } else {
        createTag();
      }
    }
    if (e.key === "Escape") setShowTagSuggestions(false);
  }

  // File helpers
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    set("file", f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") set("file", f);
  }

  // FAQ helpers
  function updateFaq(index: number, field: keyof FaqItem, val: string) {
    const next = [...values.faqItems];
    if (next[index]) {
      next[index] = { ...next[index], [field]: val } as FaqItem;
    }
    set("faqItems", next);
  }

  function addFaq() {
    set("faqItems", [...values.faqItems, { q: "", a: "" }]);
  }

  function removeFaq(index: number) {
    set(
      "faqItems",
      values.faqItems.filter((_, i) => i !== index),
    );
  }

  const selectedCategory = categories.find((c) => c.id === values.categoryId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(
      new Set([
        "title",
        "description",
        "categoryId",
        "content",
        "file",
        "opensAt",
        "closesAt",
      ]),
    );
    const errs = validate(values, hasExistingFile);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      const newTags = localTags.filter((t) => values.tagIds.includes(t.id));
      onSubmit({ ...values, newTags });
    }
  }

  const isAnual = values.cycleType === "anual";
  const charCount = values.description.length;
  const slugDisplay = values.slug || "novo-edital";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 0 }}
    >
      {/* ── Title & slug ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <span className="hb-eyebrow">Identificação</span>

        <div className="hb-form-row" style={{ marginTop: 16 }}>
          <label htmlFor={titleId} style={{ fontSize: 12, fontWeight: 600 }}>
            Título <span style={{ color: "var(--hb-red)" }}>*</span>
          </label>
          <input
            id={titleId}
            type="text"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            onBlur={() => blur("title")}
            placeholder="Ex.: Edital de Projetos Missionários 2026"
            className="hb-form-input"
            style={errors.title ? { borderColor: "var(--hb-red)" } : {}}
            aria-invalid={!!errors.title}
            maxLength={200}
          />
          {errors.title && <FieldError message={errors.title} />}
        </div>

        <div className="hb-form-row" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Slug</label>
          <div className="hb-form-hint">
            Gerado automaticamente a partir do título.
          </div>
          <input
            type="text"
            value={slugDisplay}
            readOnly
            className="hb-form-input"
            style={{
              background: "var(--bg-alt)",
              cursor: "default",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
            }}
          />
          <div className="hb-form-hint">
            URL pública:{" "}
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--brand)",
              }}
            >
              docs.hebronaseec.com.br/editais/{slugDisplay}
            </code>
          </div>
        </div>
      </section>

      {/* ── Description ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <span className="hb-eyebrow">Resumo</span>
        <div className="hb-form-row" style={{ marginTop: 16, marginBottom: 0 }}>
          <label htmlFor={descId} style={{ fontSize: 12, fontWeight: 600 }}>
            Descrição
          </label>
          <div className="hb-form-hint">
            Aparece nos cards do edital e na listagem pública.
          </div>
          <textarea
            id={descId}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            onBlur={() => blur("description")}
            rows={3}
            maxLength={1000}
            placeholder="Descreva o propósito e escopo deste edital."
            className="hb-form-textarea"
            style={{
              minHeight: 80,
              ...(errors.description ? { borderColor: "var(--hb-red)" } : {}),
            }}
            aria-invalid={!!errors.description}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {errors.description ? (
              <FieldError message={errors.description} />
            ) : (
              <span />
            )}
            <span
              style={{
                fontSize: 11,
                color:
                  charCount > 900 ? "var(--hb-orange)" : "var(--fg-subtle)",
              }}
            >
              {charCount}/1000
            </span>
          </div>
        </div>
      </section>

      {/* ── Cycle & dates ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <CalendarDays size={15} style={{ color: "var(--brand)" }} />
          <span className="hb-eyebrow" style={{ marginBottom: 0 }}>
            Cronograma
          </span>
        </div>

        {/* Cycle type */}
        <div className="hb-form-row">
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Tipo de edital
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {(
              [
                {
                  value: "anual" as const,
                  label: "Anual",
                  desc: "Tem data de abertura e fechamento definidas.",
                },
                {
                  value: "pontual" as const,
                  label: "Permanente (pontual)",
                  desc: "Sempre disponível, sem janela de submissão.",
                },
              ] satisfies { value: CycleType; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("cycleType", opt.value)}
                style={{
                  padding: "12px 14px",
                  border: `2px solid ${values.cycleType === opt.value ? "var(--brand)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  background:
                    values.cycleType === opt.value
                      ? "rgba(32,44,133,0.06)"
                      : "var(--surface)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all var(--dur-fast)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13.5,
                    color:
                      values.cycleType === opt.value
                        ? "var(--brand)"
                        : "var(--fg)",
                    marginBottom: 2,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {opt.label}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--fg-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {isAnual && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div className="hb-form-row" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                Abertura <span style={{ color: "var(--hb-red)" }}>*</span>
              </label>
              <input
                type="date"
                value={values.opensAt}
                onChange={(e) => set("opensAt", e.target.value)}
                onBlur={() => blur("opensAt")}
                className="hb-form-input"
                style={errors.opensAt ? { borderColor: "var(--hb-red)" } : {}}
                aria-invalid={!!errors.opensAt}
              />
              {errors.opensAt && <FieldError message={errors.opensAt} />}
            </div>
            <div className="hb-form-row" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                Fechamento <span style={{ color: "var(--hb-red)" }}>*</span>
              </label>
              <input
                type="date"
                value={values.closesAt}
                onChange={(e) => set("closesAt", e.target.value)}
                onBlur={() => blur("closesAt")}
                className="hb-form-input"
                min={values.opensAt || undefined}
                style={errors.closesAt ? { borderColor: "var(--hb-red)" } : {}}
                aria-invalid={!!errors.closesAt}
              />
              {errors.closesAt && <FieldError message={errors.closesAt} />}
            </div>
          </div>
        )}

        {!isAnual && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(7,180,231,0.07)",
              border: "1px solid rgba(7,180,231,0.2)",
              fontSize: 12.5,
              color: "var(--hb-cyan-deep, #0592b8)",
            }}
          >
            <Info size={13} aria-hidden="true" />
            Este edital ficará permanentemente disponível no portal, sem janela
            de submissão.
          </div>
        )}
      </section>

      {/* ── Projetos integration ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <span className="hb-eyebrow">Integração com Projetos</span>
        <div
          className="hb-form-hint"
          style={{ marginTop: 4, marginBottom: 16 }}
        >
          Esses campos pré-preenchem o wizard de submissão quando o usuário
          clica em "Submeter projeto" neste edital.
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div className="hb-form-row" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Tipo de projeto
            </label>
            <select
              value={values.projectType}
              onChange={(e) => set("projectType", e.target.value)}
              className="hb-form-select"
            >
              {PROJECT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="hb-form-row" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Categoria de projeto
            </label>
            <select
              value={values.projectCategory}
              onChange={(e) => set("projectCategory", e.target.value)}
              className="hb-form-select"
            >
              {PROJECT_CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {values.projectType && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: "var(--radius-xs, 4px)",
              background: "var(--bg-alt)",
              fontSize: 12,
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            URL gerada:{" "}
            <span style={{ color: "var(--brand)" }}>
              projetos.hebronaseec.com.br/novo?edital={slugDisplay}
            </span>
          </div>
        )}
      </section>

      {/* ── Content ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span className="hb-eyebrow" style={{ marginBottom: 0 }}>
            Conteúdo do edital
          </span>
          <div
            role="group"
            aria-label="Modo de conteúdo"
            style={{
              display: "flex",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
            }}
          >
            {(["markdown", "pdf"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("contentMode", m)}
                aria-pressed={values.contentMode === m}
                style={{
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  border: "none",
                  cursor: "pointer",
                  background:
                    values.contentMode === m
                      ? "var(--brand)"
                      : "var(--surface)",
                  color:
                    values.contentMode === m
                      ? "var(--brand-fg)"
                      : "var(--fg-muted)",
                  transition: "all var(--dur-fast)",
                }}
              >
                {m === "markdown" ? "Markdown" : "PDF"}
              </button>
            ))}
          </div>
        </div>

        {values.contentMode === "markdown" ? (
          <div className="hb-form-row" style={{ marginBottom: 0 }}>
            <MarkdownEditor
              id={contentId}
              value={values.content}
              onChange={(v) => set("content", v)}
              minHeight={360}
              placeholder="# Edital 2026&#10;&#10;## 1. Objeto&#10;Descreva o edital em Markdown…"
            />
            {errors.content && <FieldError message={errors.content} />}
          </div>
        ) : (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${errors.file ? "var(--hb-red)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "32px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color var(--dur-fast)",
                background: "var(--bg-alt)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--brand)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  errors.file ? "var(--hb-red)" : "var(--border)")
              }
            >
              {values.file ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(32,44,133,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={22} style={{ color: "var(--brand)" }} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--fg)",
                        marginBottom: 2,
                      }}
                    >
                      {values.file.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                      {formatBytes(values.file.size)} · PDF
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      set("file", null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="hb-btn hb-btn-ghost hb-btn-xs"
                    aria-label="Remover arquivo"
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload
                    size={26}
                    style={{
                      color: "var(--fg-muted)",
                      margin: "0 auto 10px",
                      display: "block",
                    }}
                    aria-hidden="true"
                  />
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    Arraste um PDF ou clique para escolher
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    Máximo 50 MB · PDF apenas
                  </div>
                </>
              )}
            </div>
            {errors.file && <FieldError message={errors.file} />}
            {pdfUrl && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    background: "var(--bg-alt)",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 11.5,
                    color: "var(--fg-muted)",
                    fontWeight: 600,
                  }}
                >
                  <FileText size={12} aria-hidden="true" />
                  Preview do PDF
                </div>
                <iframe
                  src={pdfUrl}
                  title="Preview do PDF"
                  style={{
                    width: "100%",
                    height: 480,
                    border: "none",
                    display: "block",
                    background: "var(--bg-alt)",
                  }}
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
              aria-hidden="true"
            />
          </div>
        )}
      </section>

      {/* ── FAQ ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <span className="hb-eyebrow">Perguntas frequentes</span>
        <div
          className="hb-form-hint"
          style={{ marginTop: 4, marginBottom: 16 }}
        >
          Aparecem na lateral da página pública do edital. Ordene como preferir.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {values.faqItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                padding: "14px 16px",
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "var(--brand)",
                  color: "var(--brand-fg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {idx + 1}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="text"
                  value={item.q}
                  onChange={(e) => updateFaq(idx, "q", e.target.value)}
                  placeholder="Pergunta"
                  className="hb-form-input"
                  style={{ fontWeight: 600 }}
                  aria-label={`Pergunta ${idx + 1}`}
                />
                <textarea
                  value={item.a}
                  onChange={(e) => updateFaq(idx, "a", e.target.value)}
                  placeholder="Resposta"
                  className="hb-form-textarea"
                  style={{ minHeight: 64 }}
                  aria-label={`Resposta ${idx + 1}`}
                />
              </div>

              <button
                type="button"
                onClick={() => removeFaq(idx)}
                className="hb-btn hb-btn-ghost hb-btn-xs"
                aria-label={`Remover pergunta ${idx + 1}`}
                style={{ marginTop: 1 }}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addFaq}
          className="hb-btn hb-btn-ghost hb-btn-sm"
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        >
          <Plus size={13} aria-hidden="true" />
          Adicionar pergunta
        </button>
      </section>

      {/* ── Metadata ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <span className="hb-eyebrow">Metadados</span>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div className="hb-form-row" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Visibilidade
            </label>
            <select
              value={values.visibility}
              onChange={(e) => set("visibility", e.target.value as Visibility)}
              className="hb-form-select"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hb-form-row" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Categoria <span style={{ color: "var(--hb-red)" }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCatPicker((v) => !v)}
              aria-expanded={showCatPicker}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                width: "100%",
                padding: "9px 13px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${errors.categoryId ? "var(--hb-red)" : "var(--border)"}`,
                background: "var(--surface)",
                cursor: "pointer",
                fontSize: 13,
                color: selectedCategory ? "var(--fg)" : "var(--fg-muted)",
                fontFamily: "var(--font-body)",
                textAlign: "left",
              }}
            >
              <span>{selectedCategory?.name ?? "Selecione…"}</span>
              <ChevronDown
                size={14}
                style={{
                  color: "var(--fg-muted)",
                  transform: showCatPicker ? "rotate(180deg)" : "none",
                  transition: "transform var(--dur-fast)",
                }}
              />
            </button>
            {errors.categoryId && <FieldError message={errors.categoryId} />}
          </div>
        </div>

        {showCatPicker && (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              padding: "8px",
              maxHeight: 260,
              overflowY: "auto",
              marginTop: 8,
            }}
          >
            <CategoryTree
              categories={categories}
              selectedId={values.categoryId || null}
              onSelect={(id) => {
                if (id) {
                  set("categoryId", id);
                  setShowCatPicker(false);
                  blur("categoryId");
                }
              }}
            />
          </div>
        )}
      </section>

      {/* ── Tags ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        <span className="hb-eyebrow">Tags</span>
        <div className="hb-form-row" style={{ marginTop: 16, marginBottom: 0 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tags</label>

          {selectedTags.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px 3px 8px",
                    borderRadius: "var(--radius-pill)",
                    background: tag.color
                      ? `color-mix(in srgb, ${tag.color} 14%, transparent)`
                      : "var(--bg-alt)",
                    color: tag.color ?? "var(--fg)",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor: tag.color
                      ? `color-mix(in srgb, ${tag.color} 30%, transparent)`
                      : "var(--border)",
                  }}
                >
                  <TagIcon size={10} aria-hidden="true" />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => removeTag(tag.id)}
                    aria-label={`Remover tag ${tag.name}`}
                    style={{
                      display: "flex",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      color: "inherit",
                      opacity: 0.6,
                    }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 13px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <Plus
                size={13}
                style={{ color: "var(--fg-muted)", flexShrink: 0 }}
              />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowTagSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={handleTagKeyDown}
                onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
                onBlur={() =>
                  setTimeout(() => setShowTagSuggestions(false), 150)
                }
                placeholder="Pesquisar ou criar tag…"
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: "var(--fg)",
                  fontFamily: "var(--font-body)",
                  flex: 1,
                }}
              />
            </div>

            {showTagSuggestions &&
              (tagSuggestions.length > 0 || canCreateTag) && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "var(--shadow-md)",
                    marginTop: 4,
                    overflow: "hidden",
                  }}
                >
                  {canCreateTag && (
                    <button
                      type="button"
                      onClick={createTag}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "9px 12px",
                        background: "rgba(32,44,133,0.05)",
                        borderBottom:
                          tagSuggestions.length > 0
                            ? "1px solid var(--border)"
                            : "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--brand)",
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(32,44,133,0.1)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(32,44,133,0.05)")
                      }
                    >
                      <Plus
                        size={12}
                        style={{ flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      Criar tag &ldquo;{tagInput.trim()}&rdquo;
                    </button>
                  )}
                  {tagSuggestions.slice(0, 8).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "9px 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--fg)",
                        fontFamily: "var(--font-body)",
                        textAlign: "left",
                        transition: "background var(--dur-fast)",
                      }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "var(--bg-alt)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent")
                      }
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: tag.color ?? "var(--fg-muted)",
                          flexShrink: 0,
                        }}
                      />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* ── Actions ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingTop: 4,
        }}
      >
        {onSaveDraft && (
          <button
            type="button"
            onClick={() => onSaveDraft(values)}
            className="hb-btn hb-btn-ghost hb-btn-sm"
            disabled={isLoading}
          >
            Salvar rascunho
          </button>
        )}

        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          <button
            type="submit"
            className="hb-btn hb-btn-primary"
            disabled={isLoading}
          >
            <Check size={14} aria-hidden="true" />
            {mode === "edit" ? "Atualizar edital" : "Criar edital"}
          </button>
        </div>
      </div>
    </form>
  );
}
