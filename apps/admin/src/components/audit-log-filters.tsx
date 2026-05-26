"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ─── Audit actions listed in the schema ──────────────────────────────────────

const AUDIT_ACTIONS = [
  "user.created",
  "user.updated",
  "user.suspended",
  "user.approved",
  "user.impersonated",
  "role.granted",
  "role.revoked",
  "invitation.created",
  "invitation.accepted",
  "invitation.revoked",
  "setting.updated",
  "feature_flag.toggled",
  "email_template.updated",
  "meeting.created",
  "meeting.updated",
  "designation.assigned",
  "designation.revoked",
] as const;

export interface AuditLogFiltersValue {
  actor?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [actor, setActor] = React.useState(searchParams.get("actor") ?? "");
  const [action, setAction] = React.useState(searchParams.get("action") ?? "");
  const [entity, setEntity] = React.useState(searchParams.get("entity") ?? "");
  const [from, setFrom] = React.useState(searchParams.get("from") ?? "");
  const [to, setTo] = React.useState(searchParams.get("to") ?? "");

  const hasFilters = !!(actor || action || entity || from || to);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (actor.trim()) params.set("actor", actor.trim());
    if (action) params.set("action", action);
    if (entity.trim()) params.set("entity", entity.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    setActor("");
    setAction("");
    setEntity("");
    setFrom("");
    setTo("");
    router.push(pathname);
  }

  return (
    <form
      onSubmit={apply}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {/* Actor */}
        <label style={labelStyle}>
          <span style={labelTextStyle}>Ator</span>
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Nome do ator"
            style={inputStyle}
          />
        </label>

        {/* Action */}
        <label style={labelStyle}>
          <span style={labelTextStyle}>Ação</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">Todas as ações</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {/* Entity */}
        <label style={labelStyle}>
          <span style={labelTextStyle}>Entidade</span>
          <input
            type="text"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="user, invitation…"
            style={inputStyle}
          />
        </label>

        {/* From */}
        <label style={labelStyle}>
          <span style={labelTextStyle}>De</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={inputStyle}
          />
        </label>

        {/* To */}
        <label style={labelStyle}>
          <span style={labelTextStyle}>Até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Actions row */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {hasFilters && (
          <button type="button" onClick={clear} style={btnGhostStyle}>
            Limpar filtros
          </button>
        )}
        <button type="submit" style={btnPrimaryStyle}>
          Filtrar
        </button>
      </div>
    </form>
  );
}

// ─── Micro styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  border: "1px solid #d1d5db",
  borderRadius: 7,
  fontSize: 13,
  color: "#131737",
  background: "#f9fafb",
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};

const btnPrimaryStyle: React.CSSProperties = {
  height: 34,
  padding: "0 18px",
  borderRadius: 7,
  border: "none",
  background: "#202c85",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnGhostStyle: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: 7,
  border: "1px solid #d1d5db",
  background: "transparent",
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};
