-- Migration: 0001_notifications
-- Expande public.notifications com channel, type, payload e sent_at.

-- ---------------------------------------------------------------------------
-- Enum: notification_channel
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "public"."notification_channel" AS ENUM ('in_app', 'email');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Colunas adicionais em public.notifications
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."notifications"
  ADD COLUMN IF NOT EXISTS "channel"  "public"."notification_channel" NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS "type"     text        NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS "payload"  jsonb,
  ADD COLUMN IF NOT EXISTS "sent_at"  timestamptz;

-- ---------------------------------------------------------------------------
-- Índices adicionais
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS notifications_user_id_read_at_idx
  ON public.notifications (user_id, read_at);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);
