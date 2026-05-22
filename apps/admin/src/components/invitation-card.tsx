"use client";

import { Mail, Clock, User, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@hebron/ui";
import type { Invitation } from "@hebron/types/admin";
import { RoleBadge } from "./role-badge";
import { StatusBadge } from "./status-badge";

interface InvitationCardProps {
  invitation: Invitation;
  invitedByName?: string;
  onResend?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function isExpiringSoon(expiresAt: Date): boolean {
  const diff = expiresAt.getTime() - Date.now();
  return diff > 0 && diff < 48 * 60 * 60 * 1000; // < 48h
}

export function InvitationCard({
  invitation,
  invitedByName,
  onResend,
  onRevoke,
}: InvitationCardProps) {
  const expiringSoon =
    invitation.status === "pending" && isExpiringSoon(invitation.expiresAt);

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
        gap: "0.875rem",
      }}
    >
      {/* Email + status */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            minWidth: 0,
          }}
        >
          <Mail
            size={16}
            style={{ flexShrink: 0, color: "var(--color-muted-foreground)" }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {invitation.email}
          </span>
        </div>
        <StatusBadge status={invitation.status} size="sm" />
      </div>

      {/* Role */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <RoleBadge role={invitation.role} size="sm" />
      </div>

      {/* Meta: invited by + dates */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          fontSize: "var(--text-xs)",
          color: "var(--color-muted-foreground)",
        }}
      >
        {invitedByName && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <User size={12} aria-hidden="true" />
            <span>Convidado por {invitedByName}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Clock size={12} aria-hidden="true" />
          <span>Enviado em {formatDate(invitation.invitedAt)}</span>
        </div>
        {invitation.status === "pending" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              color: expiringSoon
                ? "var(--color-accent)"
                : "var(--color-muted-foreground)",
              fontWeight: expiringSoon
                ? "var(--font-weight-medium)"
                : undefined,
            }}
          >
            <Clock size={12} aria-hidden="true" />
            <span>
              Expira em {formatDate(invitation.expiresAt)}
              {expiringSoon ? " — expirando em breve" : ""}
            </span>
          </div>
        )}
        {invitation.acceptedAt && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <Clock size={12} aria-hidden="true" />
            <span>Aceito em {formatDate(invitation.acceptedAt)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {invitation.status === "pending" && (onResend ?? onRevoke) && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            paddingTop: "0.25rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {onResend && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => onResend(invitation.id)}
            >
              Reenviar
            </Button>
          )}
          {onRevoke && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<XCircle size={14} />}
              onClick={() => onRevoke(invitation.id)}
              style={{ color: "var(--color-destructive)" }}
            >
              Revogar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
