-- Migration: 0022_flats_audit_actions
-- P-7.6 — Schema do Banco Flats (G6.3): ciclo de vida da reserva e do
-- auxílio são mutação crítica — novas ações de audit para submissão,
-- decisão do gestor, check-in/check-out e auxílio.
--
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.submitted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.approved';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.rejected';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.checked_in';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'reservation.checked_out';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'aid.requested';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'aid.approved';
