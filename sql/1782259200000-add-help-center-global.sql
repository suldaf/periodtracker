ALTER TABLE oky_id.help_center
ADD COLUMN IF NOT EXISTS "isGlobal" boolean DEFAULT false;
