/**
 * Declaração de referência das políticas RLS ativas no sistema.
 *
 * Não executa código em runtime — serve como fonte da verdade para testes de
 * integração e para verificar se as políticas estão aplicadas corretamente.
 *
 * As políticas são definidas nas migrations SQL; este arquivo as espelha como
 * constantes tipadas para uso em assertions de teste (pg_catalog.pg_policies).
 */

// ---------------------------------------------------------------------------
// Schema: admin
// ---------------------------------------------------------------------------

export const ADMIN_RLS_POLICIES = {
  /** admin.audit_log — imutável, apenas super_admin lê (inserção via SECURITY DEFINER) */
  auditLog: {
    selectSuperAdmin: "audit_log_select_super_admin",
    insertService: "audit_log_insert_service",
  },

  /**
   * admin.invitations
   *   super_admin   → acesso total via "invitations_write_super_admin" (FOR ALL)
   *   email-match   → SELECT para convidado autenticado aceitar o convite
   *   sem autenticação → Server Action usa service role (bypassa RLS)
   */
  invitations: {
    writeSuperAdmin: "invitations_write_super_admin",
    selectOwnEmail: "invitations_select_own_email",
  },

  /** admin.email_templates */
  emailTemplates: {
    selectAdmin: "email_templates_select_admin",
    writeSuperAdmin: "email_templates_write_super_admin",
  },

  /** admin.meeting_sessions — conselheiros e acima podem ler; diretores e acima escrevem */
  meetingSessions: {
    selectBoard: "meeting_sessions_select_board",
    writeAdmin: "meeting_sessions_write_admin",
  },

  /** admin.feature_flags — qualquer autenticado lê; só super_admin grava */
  featureFlags: {
    selectAuthenticated: "feature_flags_select_authenticated",
    writeSuperAdmin: "feature_flags_write_super_admin",
  },

  /** admin.system_settings — públicas para autenticados; privadas só admin */
  systemSettings: {
    selectPublic: "system_settings_select_public",
    selectAdmin: "system_settings_select_admin",
    writeSuperAdmin: "system_settings_write_super_admin",
  },
} as const;

// ---------------------------------------------------------------------------
// Schema: public
// ---------------------------------------------------------------------------

export const PUBLIC_RLS_POLICIES = {
  /**
   * public.users
   *   próprio usuário → SELECT + UPDATE do próprio registro
   *   super_admin / diretor → SELECT em todos os registros
   *   inserção → trigger SECURITY DEFINER (auto-sync de auth.users)
   */
  users: {
    selectOwn: "users_select_own",
    selectAdmin: "users_select_admin",
    updateOwn: "users_update_own",
    insertService: "users_insert_service",
  },

  /**
   * public.users.status — não é uma policy RLS separada (a coluna está sob
   * users_update_own), mas protegida por trigger: users_protect_status
   * bloqueia qualquer mudança de status por quem não é super_admin, mesmo
   * que o próprio usuário passe no USING/WITH CHECK de users_update_own.
   * Ver packages/db/src/migrations/0015_user_status.sql.
   */

  /**
   * public.role_assignments
   *   próprio usuário → SELECT das próprias atribuições
   *   super_admin / diretor → SELECT em todas
   *   só super_admin → INSERT / UPDATE / DELETE
   */
  roleAssignments: {
    selectOwn: "role_assignments_select_own",
    selectAdmin: "role_assignments_select_admin",
    writeSuperAdmin: "role_assignments_write_super_admin",
  },

  /** public.designations — leitura para admin; mutação só super_admin */
  designations: {
    selectAdmin: "designations_select_admin",
    writeSuperAdmin: "designations_write_super_admin",
  },

  /**
   * public.notifications
   *   próprio usuário → SELECT + UPDATE (marcar como lida)
   *   inserção → Edge Functions / Server Actions via service role
   */
  notifications: {
    selectOwn: "notifications_select_own",
    updateOwn: "notifications_update_own",
    insertService: "notifications_insert_service",
  },
} as const;

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export type AdminRlsPolicies = typeof ADMIN_RLS_POLICIES;
export type PublicRlsPolicies = typeof PUBLIC_RLS_POLICIES;
