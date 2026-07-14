ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'course.published';--> statement-breakpoint
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'certificate.issued';
