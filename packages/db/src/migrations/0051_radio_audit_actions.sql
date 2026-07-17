-- Migration: 0051_radio_audit_actions
-- P-8.8 — Server Actions Rádio: novos valores de admin.audit_action para as
-- mutações do schema `radio` (CRUD de autores/séries/faixas/playlists,
-- material exclusivo e aceite de termo, G6.3). Não listada nos arquivos
-- permitidos do prompt, mas obrigatória por G6.3: sem estes valores, todo
-- INSERT em admin.audit_log a partir das novas Server Actions falha em
-- runtime (mesmo achado F3-02 de 0022_flats_audit_actions.sql).
-- ALTER TYPE ... ADD VALUE é não-transacional — o runner detecta isso.

ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'author.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'author.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'author.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'series.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'series.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'series.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'track.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'playlist.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'playlist.updated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'playlist.deleted';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'playlist.activated';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'material.created';
ALTER TYPE "admin"."audit_action" ADD VALUE IF NOT EXISTS 'term.accepted';
