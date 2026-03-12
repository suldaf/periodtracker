ALTER TABLE oky_id.help_center
ADD COLUMN IF NOT EXISTS "serviceKind" VARCHAR(10);

ALTER TABLE oky_id.help_center
ADD CONSTRAINT "help_center_serviceKind_chk"
CHECK ("serviceKind" IN ('offline','online','both'));