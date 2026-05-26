-- Migration: add "invitation.accepted" to admin.audit_action enum
-- ALTER TYPE ... ADD VALUE is non-transactional in PostgreSQL and must run outside a transaction block.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'invitation.accepted' AFTER 'invitation.created';
