-- Migration: 0047_flats_audit_actions_p78
-- P-7.8 — Server Actions Flats: novas ações de audit para transições não
-- cobertas em 0022_flats_audit_actions.sql (P-7.6) — confirmação e
-- cancelamento de reserva (soft-delete com justificativa), e rejeição de
-- auxílio (contraparte de aid.approved).
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.confirmed';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.cancelled';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'aid.rejected';
