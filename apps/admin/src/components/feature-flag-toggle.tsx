"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import type { FeatureFlag } from "@hebron/types/admin";

interface FeatureFlagToggleProps {
  flag: FeatureFlag;
  onToggle?: (id: string, enabled: boolean) => void;
  disabled?: boolean;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FeatureFlagToggle({
  flag,
  onToggle,
  disabled = false,
}: FeatureFlagToggleProps) {
  const [optimisticEnabled, setOptimisticEnabled] = React.useState(
    flag.enabled,
  );

  // Sync if prop changes
  React.useEffect(() => {
    setOptimisticEnabled(flag.enabled);
  }, [flag.enabled]);

  function handleToggle() {
    if (disabled) return;
    const next = !optimisticEnabled;
    setOptimisticEnabled(next);
    onToggle?.(flag.id, next);
  }

  const toggleId = `ff-toggle-${flag.id}`;

  return (
    <div
      style={{
        backgroundColor: "var(--color-background)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "1rem",
      }}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <label
          htmlFor={toggleId}
          style={{
            display: "block",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-foreground)",
            cursor: disabled ? "default" : "pointer",
            marginBottom: "0.25rem",
            fontFamily: "var(--font-mono)",
          }}
        >
          {flag.key}
        </label>

        {flag.description && (
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-muted-foreground)",
              lineHeight: "var(--leading-snug)",
              marginBottom: "0.5rem",
            }}
          >
            {flag.description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Rollout indicator */}
          {flag.rolloutPercent > 0 && flag.rolloutPercent < 100 && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-muted-foreground)",
                backgroundColor: "var(--color-muted)",
                borderRadius: "var(--radius-full)",
                padding: "0.125rem 0.5rem",
              }}
            >
              {flag.rolloutPercent}% de rollout
            </span>
          )}

          {/* Last updated */}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "var(--text-xs)",
              color: "var(--color-muted-foreground)",
            }}
          >
            <Clock size={11} aria-hidden="true" />
            {formatDate(flag.updatedAt)}
          </span>
        </div>
      </div>

      {/* Toggle switch */}
      <div style={{ flexShrink: 0, paddingTop: "0.125rem" }}>
        <button
          id={toggleId}
          role="switch"
          aria-checked={optimisticEnabled}
          aria-label={`${optimisticEnabled ? "Desativar" : "Ativar"} ${flag.key}`}
          disabled={disabled}
          onClick={handleToggle}
          style={{
            position: "relative",
            display: "inline-flex",
            height: "1.375rem",
            width: "2.375rem",
            cursor: disabled ? "not-allowed" : "pointer",
            alignItems: "center",
            borderRadius: "var(--radius-full)",
            border: "none",
            padding: 0,
            backgroundColor: optimisticEnabled
              ? "var(--color-primary)"
              : "var(--color-subtle)",
            transition: "background-color var(--transition-fast)",
            opacity: disabled ? 0.5 : 1,
            outline: "none",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 0 2px var(--color-ring)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: "1rem",
              height: "1rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#fff",
              boxShadow: "var(--shadow-xs)",
              transform: optimisticEnabled
                ? "translateX(1.125rem)"
                : "translateX(0.1875rem)",
              transition: "transform var(--transition-fast)",
            }}
          />
        </button>
      </div>
    </div>
  );
}
