import type { DesignationType, Role, Scope } from "../roles";

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserStatus =
  | "active"
  | "suspended"
  | "pending_approval"
  | "invited";

export interface User {
  id: string;
  authId: string; // Supabase auth user ID
  name: string;
  email: string;
  avatarUrl: string | null;
  status: UserStatus;
  mfaEnabled: boolean;
  /** Modules the user can access; empty = all allowed (unless suspended) */
  moduleAccess: Scope[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  approvedBy: string | null; // user ID
  approvedAt: Date | null;
}

// ─── RoleAssignment ───────────────────────────────────────────────────────────

export interface RoleAssignment {
  id: string;
  userId: string;
  role: Role;
  scope: Scope;
  grantedBy: string; // user ID
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null; // user ID
  revocationReason: string | null;
}

// ─── Invitation ───────────────────────────────────────────────────────────────

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  invitedBy: string; // user ID
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  status: InvitationStatus;
  token: string;
}

// ─── AuditLogEntry ────────────────────────────────────────────────────────────

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.suspended"
  | "user.approved"
  | "user.impersonated"
  | "role.granted"
  | "role.revoked"
  | "invitation.created"
  | "invitation.revoked"
  | "setting.updated"
  | "feature_flag.toggled"
  | "email_template.updated"
  | "meeting.created"
  | "meeting.updated"
  | "designation.assigned"
  | "designation.revoked";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  targetId: string | null;
  targetType: string | null;
  action: AuditAction;
  payload: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ─── SystemSetting ────────────────────────────────────────────────────────────

export type SettingValueType = "string" | "number" | "boolean" | "json";

export interface SystemSetting {
  id: string;
  key: string;
  /** Always stored as string; parse using valueType */
  value: string;
  valueType: SettingValueType;
  label: string;
  description: string | null;
  /** Readable by any authenticated user */
  isPublic: boolean;
  updatedBy: string; // user ID
  updatedAt: Date;
}

// ─── FeatureFlag ──────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  /** 0–100 progressive rollout percentage */
  rolloutPercent: number;
  updatedBy: string; // user ID
  updatedAt: Date;
}

// ─── EmailTemplate ────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  /** Stable identifier, e.g. "invitation", "approval_notification" */
  key: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  /** Variable placeholder names available in the template */
  variables: string[];
  updatedBy: string; // user ID
  updatedAt: Date;
}

// ─── MeetingSession ───────────────────────────────────────────────────────────

export type MeetingType = "mensal" | "ordinaria" | "extraordinaria";
export type MeetingStatus =
  | "scheduled"
  | "in_progress"
  | "concluded"
  | "cancelled";

export interface MeetingSession {
  id: string;
  date: Date;
  type: MeetingType;
  /** User ID of the presiding director */
  chairUserId: string;
  status: MeetingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Designation ──────────────────────────────────────────────────────────────

export interface Designation {
  id: string;
  userId: string;
  /** Denormalized for display */
  directorName: string;
  type: DesignationType;
  assignedBy: string; // user ID
  assignedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null; // user ID
  revocationReason: string | null;
}
