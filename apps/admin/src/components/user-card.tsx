"use client";

import { Shield, Clock, MoreVertical } from "lucide-react";
import { Button } from "@hebron/ui";
import type { User } from "@hebron/types/admin";
import type { Role } from "@hebron/types/roles";
import { RoleBadge } from "./role-badge";
import { StatusBadge } from "./status-badge";

interface UserCardProps {
  user: User;
  roles: Role[];
  onEdit?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onApprove?: (id: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function UserCard({
  user,
  roles,
  onEdit,
  onSuspend,
  onApprove,
}: UserCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-background)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header: avatar + name + menu */}
      <div
        style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
      >
        {/* Avatar */}
        <div
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-primary-muted)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            overflow: "hidden",
          }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            getInitials(user.name)
          )}
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </p>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-muted-foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: "0.125rem",
            }}
          >
            {user.email}
          </p>
        </div>

        {/* Actions menu */}
        {(onEdit ?? onSuspend ?? onApprove) && (
          <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(user.id)}
                aria-label="Editar usuário"
              >
                <MoreVertical size={16} />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Roles */}
      {roles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {roles.map((role) => (
            <RoleBadge key={role} role={role} size="sm" />
          ))}
        </div>
      )}

      {/* Status + MFA */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <StatusBadge status={user.status} size="sm" />
        {user.mfaEnabled && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "var(--text-xs)",
              color: "var(--color-support-sky)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            <Shield size={12} />
            MFA
          </span>
        )}
      </div>

      {/* Last login */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "var(--text-xs)",
          color: "var(--color-muted-foreground)",
          paddingTop: "0.25rem",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <Clock size={12} aria-hidden="true" />
        <span>Último acesso: {formatDate(user.lastLoginAt)}</span>
      </div>

      {/* Approval action */}
      {user.status === "pending_approval" && onApprove && (
        <Button
          size="sm"
          variant="accent"
          onClick={() => onApprove(user.id)}
          style={{ width: "100%" }}
        >
          Aprovar acesso
        </Button>
      )}

      {/* Suspend action */}
      {user.status === "active" && onSuspend && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSuspend(user.id)}
          style={{
            width: "100%",
            color: "var(--color-destructive)",
            borderColor: "var(--color-destructive)",
          }}
        >
          Suspender
        </Button>
      )}
    </div>
  );
}
