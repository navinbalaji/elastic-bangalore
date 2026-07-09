-- Add unique browser user key per participant (not name-based)
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "user_key" text;

-- Backfill existing rows with generated keys
UPDATE "participants"
SET "user_key" = gen_random_uuid()::text
WHERE "user_key" IS NULL;

ALTER TABLE "participants" ALTER COLUMN "user_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "participants_user_key_idx" ON "participants" ("user_key");
