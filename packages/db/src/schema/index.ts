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
