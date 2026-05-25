// Re-exports public schema primitives (excluding the minimal notifications
// stub — the expanded version lives in notifications.ts).
export {
  adminSchema,
  projetosSchema,
  plataformaSchema,
  radioSchema,
  financeiroSchema,
  intranetSchema,
  documentosSchema,
  flatsSchema,
  tarefasSchema,
  roleEnum,
  designationTypeEnum,
  users,
  roleAssignments,
  designations,
} from "./public";

export type {
  User,
  NewUser,
  RoleAssignment,
  NewRoleAssignment,
  Designation,
  NewDesignation,
} from "./public";

// Expanded notifications schema
export { notificationChannelEnum, notifications } from "./notifications";

export type { Notification, NewNotification } from "./notifications";

// Admin schema
export {
  auditActionEnum,
  meetingTypeEnum,
  meetingStatusEnum,
  auditLog,
  invitations,
  emailTemplates,
  meetingSessions,
  featureFlags,
  systemSettings,
} from "./admin";

export type {
  AuditLog,
  NewAuditLog,
  Invitation,
  NewInvitation,
  EmailTemplate,
  NewEmailTemplate,
  MeetingSession,
  NewMeetingSession,
  FeatureFlag,
  NewFeatureFlag,
  SystemSetting,
  NewSystemSetting,
} from "./admin";
