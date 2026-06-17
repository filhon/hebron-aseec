"use client";

import { useState, useCallback, useId } from "react";
import {
  AlertCircle,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Mail,
} from "lucide-react";
import type { Category } from "@hebron/types/documentos";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategorySubscription {
  categoryId: string;
  onNewVersion: boolean;
  onEditalOpen: boolean;
}

export interface SubscriptionFormValues {
  email: string;
  subscriptions: CategorySubscription[];
}

type FormErrors = Partial<Record<"email" | "subscriptions", string>>;

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(values: SubscriptionFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Informe um e-mail válido";
  }

  return errors;
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

function Toggle({
  checked,
  onChange,
  label,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  "aria-label"?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
        style={{
          width: 34,
          height: 19,
          borderRadius: 10,
          border: "none",
          background: checked ? "var(--brand)" : "var(--hb-gray-200, #e5e7eb)",
          position: "relative",
          cursor: "pointer",
          transition: "background var(--dur-fast)",
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left var(--dur-fast)",
          }}
        />
      </button>
      <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{label}</span>
    </label>
  );
}

// ─── Category subscription row ────────────────────────────────────────────────

function CategoryRow({
  category,
  depth,
  subscription,
  onUpdate,
}: {
  category: Category;
  depth: number;
  subscription: CategorySubscription | undefined;
  onUpdate: (sub: CategorySubscription) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = category.children.length > 0;

  const sub: CategorySubscription = subscription ?? {
    categoryId: category.id,
    onNewVersion: false,
    onEditalOpen: false,
  };

  const isActive = sub.onNewVersion || sub.onEditalOpen;

  function update(patch: Partial<Omit<CategorySubscription, "categoryId">>) {
    onUpdate({ ...sub, ...patch });
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: 16,
          alignItems: "center",
          padding: "10px 14px",
          paddingLeft: `${14 + depth * 20}px`,
          borderRadius: "var(--radius-sm)",
          background: isActive ? "rgba(32,44,133,0.04)" : "transparent",
          border: `1px solid ${isActive ? "var(--border)" : "transparent"}`,
          marginBottom: 4,
          transition: "all var(--dur-fast)",
        }}
      >
        {/* Category name */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Recolher" : "Expandir"}
              aria-expanded={expanded}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--fg-muted)",
                flexShrink: 0,
                padding: 0,
              }}
            >
              {expanded ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </button>
          )}

          {!hasChildren && (
            <span
              style={{
                width: 20,
                display: "flex",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--border-strong)",
                  display: "inline-block",
                }}
              />
            </span>
          )}

          <span style={{ flexShrink: 0, color: "var(--fg-muted)" }}>
            {expanded && hasChildren ? (
              <FolderOpen size={14} aria-hidden="true" />
            ) : (
              <Folder size={14} aria-hidden="true" />
            )}
          </span>

          <span
            style={{
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--fg)" : "var(--fg-muted)",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {category.name}
          </span>

          {category.documentCount > 0 && (
            <span
              style={{
                fontSize: 10.5,
                color: "var(--fg-subtle)",
                background: "var(--bg-alt)",
                padding: "1px 6px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border)",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {category.documentCount}
            </span>
          )}
        </div>

        {/* Toggles */}
        <Toggle
          checked={sub.onNewVersion}
          onChange={(v) => update({ onNewVersion: v })}
          label="Novas versões"
          aria-label={`Notificar novas versões em ${category.name}`}
        />
        <Toggle
          checked={sub.onEditalOpen}
          onChange={(v) => update({ onEditalOpen: v })}
          label="Abertura de editais"
          aria-label={`Notificar abertura de editais em ${category.name}`}
        />
      </div>

      {hasChildren && expanded && (
        <div>
          {category.children.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              depth={depth + 1}
              subscription={undefined}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export interface SubscriptionFormProps {
  /** All categories to subscribe to. */
  categories?: Category[];
  /** The authenticated user's email (read-only). */
  userEmail?: string;
  initialSubscriptions?: CategorySubscription[];
  onSubmit: (values: SubscriptionFormValues) => void;
  isLoading?: boolean;
}

export function SubscriptionForm({
  categories = [],
  userEmail = "",
  initialSubscriptions = [],
  onSubmit,
  isLoading = false,
}: SubscriptionFormProps) {
  const emailId = useId();

  const [email, setEmail] = useState(userEmail);
  const [subscriptions, setSubscriptions] =
    useState<CategorySubscription[]>(initialSubscriptions);
  const [errors, setErrors] = useState<FormErrors>({});

  const updateSub = useCallback((sub: CategorySubscription) => {
    setSubscriptions((prev) => {
      const exists = prev.findIndex((s) => s.categoryId === sub.categoryId);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = sub;
        return next;
      }
      return [...prev, sub];
    });
  }, []);

  const getSub = useCallback(
    (categoryId: string): CategorySubscription | undefined =>
      subscriptions.find((s) => s.categoryId === categoryId),
    [subscriptions],
  );

  const activeCount = subscriptions.filter(
    (s) => s.onNewVersion || s.onEditalOpen,
  ).length;

  function selectAll(field: "onNewVersion" | "onEditalOpen") {
    const allIds = getAllCategoryIds(categories);
    setSubscriptions(
      allIds.map((id) => {
        const existing = subscriptions.find((s) => s.categoryId === id) ?? {
          categoryId: id,
          onNewVersion: false,
          onEditalOpen: false,
        };
        return { ...existing, [field]: true };
      }),
    );
  }

  function clearAll() {
    setSubscriptions([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate({ email, subscriptions });
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onSubmit({ email, subscriptions });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── Email ── */}
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
          <Mail
            size={15}
            style={{ color: "var(--brand)" }}
            aria-hidden="true"
          />
          <span className="hb-eyebrow" style={{ marginBottom: 0 }}>
            E-mail para alertas
          </span>
        </div>

        <div className="hb-form-row" style={{ marginBottom: 0 }}>
          <label htmlFor={emailId} style={{ fontSize: 12, fontWeight: 600 }}>
            Endereço de e-mail <span style={{ color: "var(--hb-red)" }}>*</span>
          </label>
          <div className="hb-form-hint">
            Você receberá alertas neste endereço para os eventos selecionados.
          </div>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.email;
                return next;
              });
            }}
            placeholder="seu@email.com"
            className="hb-form-input"
            style={errors.email ? { borderColor: "var(--hb-red)" } : {}}
            aria-invalid={!!errors.email}
          />
          {errors.email && <FieldError message={errors.email} />}
        </div>
      </section>

      {/* ── Category subscriptions ── */}
      <section
        className="hb-card"
        style={{ padding: "22px 24px", marginBottom: 14 }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="hb-eyebrow" style={{ marginBottom: 2 }}>
              Categorias
            </span>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
              Escolha para quais categorias deseja receber alertas.
            </p>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => selectAll("onNewVersion")}
              className="hb-btn hb-btn-ghost hb-btn-xs"
            >
              Todas — versões
            </button>
            <button
              type="button"
              onClick={() => selectAll("onEditalOpen")}
              className="hb-btn hb-btn-ghost hb-btn-xs"
            >
              Todas — editais
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="hb-btn hb-btn-ghost hb-btn-xs"
              style={{ color: "var(--hb-red)" }}
            >
              <BellOff size={11} aria-hidden="true" />
              Limpar
            </button>
          </div>
        </div>

        {/* Column labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 16,
            padding: "0 14px 8px",
            borderBottom: "1px solid var(--divider)",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Categoria
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            Novas versões
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            Editais
          </span>
        </div>

        {/* Rows */}
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
            Nenhuma categoria disponível.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                depth={0}
                subscription={getSub(cat.id)}
                onUpdate={updateSub}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Summary & submit ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--fg-muted)",
          }}
        >
          <Bell size={14} aria-hidden="true" />
          {activeCount === 0 ? (
            "Nenhuma categoria selecionada"
          ) : (
            <span>
              <strong style={{ color: "var(--fg)" }}>{activeCount}</strong>{" "}
              {activeCount === 1 ? "categoria ativa" : "categorias ativas"}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="hb-btn hb-btn-primary"
          disabled={isLoading}
        >
          <Check size={14} aria-hidden="true" />
          Salvar preferências
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllCategoryIds(categories: Category[]): string[] {
  const ids: string[] = [];
  for (const cat of categories) {
    ids.push(cat.id);
    ids.push(...getAllCategoryIds(cat.children));
  }
  return ids;
}
