-- Migration: 0087_plataforma_bunny_video_id
-- P-6.20 — Upload de vídeo via Bunny.net Stream.
--
-- lessons.video_url era um campo de texto livre (o instrutor colava a URL à
-- mão): sem upload, sem transcodificação, sem controle de acesso (quem
-- tivesse o link assistia sem estar matriculado). lessons.video_id passa a
-- guardar o guid do vídeo na library Bunny Stream; a reprodução usa uma URL
-- assinada por matrícula (plataforma.can_access_lesson via RLS de
-- `lessons_select_enrolled`/`lessons_mutate_staff`, 0020_plataforma_rls.sql),
-- nunca o guid cru.
--
-- video_url é mantido como fallback de aulas antigas coladas à mão —
-- migração de dados fora do escopo (decisão registrada em SESSIONS.md).
-- Nenhuma policy nova: a mesma RLS de SELECT em `lessons` que já gate video_url
-- passa a gatear video_id.

ALTER TABLE "plataforma"."lessons" ADD COLUMN IF NOT EXISTS "video_id" text;
