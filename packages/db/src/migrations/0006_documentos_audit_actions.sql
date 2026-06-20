-- Migration: 0006_documentos_audit_actions
-- Extends admin.audit_action enum with document-module values.
-- Required by apps/documentos/src/lib/audit.ts (logDocumentAudit).

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'document.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'document.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'document.published';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'document.unpublished';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'document.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'category.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'category.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'category.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'edital.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'edital.updated';
