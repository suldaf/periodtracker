ALTER TABLE "oky_id".article
ADD "isAgeRestricted" boolean DEFAULT NULL,
ADD "ageRestrictionLevel" integer DEFAULT 0 NOT NULL,
ADD "contentFilter" integer DEFAULT 0 NOT NULL;

ALTER TABLE "oky_id".quiz
ADD "ageRestrictionLevel" integer DEFAULT 0 NOT NULL,
ADD "contentFilter" integer DEFAULT 0 NOT NULL;

ALTER TABLE "oky_id".survey
ADD "ageRestrictionLevel" integer DEFAULT 0 NOT NULL,
ADD "contentFilter" integer DEFAULT 0 NOT NULL;

ALTER TABLE "oky_id"."did_you_know"
ADD "ageRestrictionLevel" integer DEFAULT 0 NOT NULL,
ADD "contentFilter" integer DEFAULT 0 NOT NULL;