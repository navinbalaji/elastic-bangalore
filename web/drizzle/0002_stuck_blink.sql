ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "stuck_at" timestamp with time zone;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "blink_at" timestamp with time zone;
