"use client";

import { useState, useCallback, useId } from "react";
import {
  AlertCircle,
  Check,
  FolderTree,
  GripVertical,
  Minus,
  Plus,
} from "lucide-react";
import type { Category } from "@hebron/types/documentos";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
}

type FormErrors = Partial<Record<keyof CategoryFormValues, string>>;

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(values: CategoryFormValues): FormErrors {
  const errors: FormErrors = {};

  const name = values.name.trim();
  if (name.length < 2) {
    errors.name = "Nome deve ter pelo menos 2 caracteres";
  } else if (name.length > 80) {
    errors.name = "Nome deve ter no máximo 80 caracteres";
  }

  if (values.description.length > 300) {
    errors.description = "Descrição deve ter no máximo 300 caracteres";
  }

  return errors;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  return (
    <span
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

// Flat tree node for parent selection
function ParentNode({
  category,
  depth,
  selectedId,
  disabledId,
  onSelect,
}: {
  category: Category;
  depth: number;
  selectedId: string | null;
  disabledId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const isSelected = selectedId === category.id;
  const isDisabled = disabledId === category.id;

  return (
    <>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(isSelected ? null : category.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 12px",
          paddingLeft: `${12 + depth * 18}px`,
          borderRadius: "var(--radius-xs, 4px)",
          border: "none",
          background: isSelected ? "var(--brand)" : "transparent",
          color: isSelected
            ? "var(--brand-fg)"
            : isDisabled
              ? "var(--fg-subtle)"
              : "var(--fg)",
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontSize: 13,
          fontFamily: "var(--font-body)",
          fontWeight: isSelected ? 600 : 400,
          textAlign: "left",
          transition: "all var(--dur-fast)",
          opacity: isDisabled ? 0.45 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !isDisabled) {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-alt)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }
        }}
      >
        <FolderTree
          size={13}
          aria-hidden="true"
          style={{ flexShrink: 0, opacity: 0.7 }}
        />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {category.name}
        </span>
        {isDisabled && (
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-subtle)",
              fontStyle: "italic",
            }}
          >
            atual
          </span>
        )}
        {isSelected && <Check size={12} aria-hidden="true" />}
      </button>

      {category.children.map((child) => (
        <ParentNode
          key={child.id}
          category={child}
          depth={depth + 1}
          selectedId={selectedId}
          disabledId={disabledId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// Reorder tree row (simplified drag indicator — visual only in Phase 1)
function ReorderRow({
  category,
  depth,
}: {
  category: Category;
  depth: number;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          paddingLeft: `${12 + depth * 18}px`,
          borderRadius: "var(--radius-xs, 4px)",
          border: "1px solid transparent",
          transition:
            "border-color var(--dur-fast), background var(--dur-fast)",
          cursor: "grab",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = "var(--bg-alt)";
          el.style.borderColor = "var(--border)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = "transparent";
          el.style.borderColor = "transparent";
        }}
        title="Arraste para reordenar"
      >
        <GripVertical
          size={14}
          style={{ color: "var(--fg-subtle)", flexShrink: 0 }}
          aria-hidden="true"
        />
        <FolderTree
          size={13}
          style={{ color: "var(--fg-muted)", flexShrink: 0 }}
          aria-hidden="true"
        />
        <span style={{ fontSize: 13, color: "var(--fg)", flex: 1 }}>
          {category.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            background: "var(--bg-alt)",
            padding: "1px 7px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
          }}
        >
          {category.documentCount} docs
        </span>
      </div>

      {category.children.map((child) => (
        <ReorderRow key={child.id} category={child} depth={depth + 1} />
      ))}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export interface CategoryFormProps {
  /** All existing categories (for parent picker & reorder tree). */
  categories?: Category[];
  /** If editing, pass the category being edited (to disable it as parent option). */
  editingCategory?: Category | null;
  initialValues?: Partial<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
  isLoading?: boolean;
}

export function CategoryForm({
  categories = [],
  editingCategory = null,
  initialValues,
  onSubmit,
  onCancel,
  mode = "create",
  isLoading = false,
}: CategoryFormProps) {
  const nameId = useId();
  const descId = useId();

  const [values, setValues] = useState<CategoryFormValues>({
    name: initialValues?.name ?? "",
    slug: initialValues?.slug ?? "",
    description: initialValues?.description ?? "",
    parentId: initialValues?.parentId ?? null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showReorder, setShowReorder] = useState(false);

  const set = useCallback(
    <K extends keyof CategoryFormValues>(
      key: K,
      val: CategoryFormValues[K],
    ) => {
      setValues((prev) => {
        const next = { ...prev, [key]: val };
        if (key === "name") {
          next.slug = toSlug(String(val));
        }
        return next;
      });
      setErrors(
        (prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([k]) => k !== key),
          ) as FormErrors,
      );
    },
    [],
  );

  const selectedParent = categories.find((c) => c.id === values.parentId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onSubmit(values);
    }
  }

  const isEdit = mode === "edit";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Category form ── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 0 }}
      >
        <section
          className="hb-card"
          style={{ padding: "22px 24px", marginBottom: 14 }}
        >
          <span className="hb-eyebrow">
            {isEdit ? "Editar categoria" : "Nova categoria"}
          </span>

          {/* Name */}
          <div className="hb-form-row" style={{ marginTop: 16 }}>
            <label htmlFor={nameId} style={{ fontSize: 12, fontWeight: 600 }}>
              Nome <span style={{ color: "var(--hb-red)" }}>*</span>
            </label>
            <input
              id={nameId}
              type="text"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Jurídico e Legal"
              className="hb-form-input"
              style={errors.name ? { borderColor: "var(--hb-red)" } : {}}
              aria-invalid={!!errors.name}
              maxLength={80}
            />
            {errors.name && <FieldError message={errors.name} />}
          </div>

          {/* Slug */}
          <div className="hb-form-row">
            <label style={{ fontSize: 12, fontWeight: 600 }}>Slug</label>
            <div className="hb-form-hint">
              Gerado automaticamente. Usado na URL e em integrações.
            </div>
            <input
              type="text"
              value={values.slug || "nova-categoria"}
              readOnly
              className="hb-form-input"
              style={{
                background: "var(--bg-alt)",
                cursor: "default",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
              }}
            />
          </div>

          {/* Description */}
          <div className="hb-form-row">
            <label htmlFor={descId} style={{ fontSize: 12, fontWeight: 600 }}>
              Descrição
            </label>
            <textarea
              id={descId}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Descreva o tipo de documentos que esta categoria agrupa."
              className="hb-form-textarea"
              style={{
                minHeight: 64,
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
                    values.description.length > 250
                      ? "var(--hb-orange)"
                      : "var(--fg-subtle)",
                }}
              >
                {values.description.length}/300
              </span>
            </div>
          </div>

          {/* Parent category */}
          <div className="hb-form-row" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Categoria pai
            </label>
            <div className="hb-form-hint">
              Deixe em branco para criar uma categoria raiz.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowParentPicker((v) => !v)}
                aria-expanded={showParentPicker}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flex: 1,
                  padding: "9px 13px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer",
                  fontSize: 13,
                  color: selectedParent ? "var(--fg)" : "var(--fg-muted)",
                  fontFamily: "var(--font-body)",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <FolderTree
                    size={13}
                    style={{ color: "var(--fg-muted)", flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  {selectedParent?.name ?? "Nenhuma (categoria raiz)"}
                </span>
              </button>

              {values.parentId && (
                <button
                  type="button"
                  onClick={() => set("parentId", null)}
                  className="hb-btn hb-btn-ghost hb-btn-sm"
                  aria-label="Remover categoria pai"
                  style={{ flexShrink: 0 }}
                >
                  <Minus size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {showParentPicker && categories.length > 0 && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  padding: "8px",
                  maxHeight: 240,
                  overflowY: "auto",
                  marginTop: 4,
                }}
              >
                {/* "No parent" option */}
                <button
                  type="button"
                  onClick={() => {
                    set("parentId", null);
                    setShowParentPicker(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 12px",
                    borderRadius: "var(--radius-xs, 4px)",
                    border: "none",
                    background:
                      values.parentId === null ? "var(--brand)" : "transparent",
                    color:
                      values.parentId === null
                        ? "var(--brand-fg)"
                        : "var(--fg-muted)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "var(--font-body)",
                    fontStyle: "italic",
                    textAlign: "left",
                    transition: "all var(--dur-fast)",
                    marginBottom: 4,
                  }}
                  onMouseEnter={(e) => {
                    if (values.parentId !== null)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--bg-alt)";
                  }}
                  onMouseLeave={(e) => {
                    if (values.parentId !== null)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                  }}
                >
                  Nenhuma (categoria raiz)
                  {values.parentId === null && (
                    <Check
                      size={12}
                      aria-hidden="true"
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </button>

                <div
                  style={{
                    height: 1,
                    background: "var(--divider)",
                    margin: "4px 8px 8px",
                  }}
                  role="separator"
                />

                {categories.map((cat) => (
                  <ParentNode
                    key={cat.id}
                    category={cat}
                    depth={0}
                    selectedId={values.parentId}
                    disabledId={editingCategory?.id ?? null}
                    onSelect={(id) => {
                      set("parentId", id);
                      setShowParentPicker(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="hb-btn hb-btn-ghost hb-btn-sm"
              disabled={isLoading}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="hb-btn hb-btn-primary"
            disabled={isLoading}
          >
            <Check size={14} aria-hidden="true" />
            {isEdit ? "Atualizar categoria" : "Criar categoria"}
          </button>
        </div>
      </form>

      {/* ── Reorder tree ── */}
      <section className="hb-card" style={{ padding: "22px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: showReorder ? 16 : 0,
          }}
        >
          <div>
            <span className="hb-eyebrow" style={{ marginBottom: 2 }}>
              Reordenar árvore
            </span>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12.5,
                color: "var(--fg-muted)",
              }}
            >
              Arraste as categorias para reorganizar a hierarquia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReorder((v) => !v)}
            className="hb-btn hb-btn-ghost hb-btn-sm"
          >
            {showReorder ? (
              <Minus size={13} aria-hidden="true" />
            ) : (
              <Plus size={13} aria-hidden="true" />
            )}
            {showReorder ? "Recolher" : "Reordenar"}
          </button>
        </div>

        {showReorder && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 2 }}
            role="tree"
            aria-label="Árvore de categorias para reordenação"
          >
            {categories.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fg-muted)",
                  fontStyle: "italic",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                Nenhuma categoria cadastrada.
              </p>
            ) : (
              categories.map((cat) => (
                <ReorderRow key={cat.id} category={cat} depth={0} />
              ))
            )}
            <p
              style={{
                fontSize: 11.5,
                color: "var(--fg-subtle)",
                marginTop: 10,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              Arrastar e soltar disponível na fase de integração com banco de
              dados.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
