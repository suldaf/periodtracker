-- Create age_category table
CREATE TABLE IF NOT EXISTS oky_id.age_category (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    lang VARCHAR(10) NOT NULL,
    "sortingKey" SERIAL,
    UNIQUE(name, lang)
);

-- Add ageCategoryId column to article table
ALTER TABLE oky_id.article 
ADD COLUMN IF NOT EXISTS "ageCategoryId" UUID REFERENCES oky_id.age_category(id) ON DELETE SET NULL;

-- Add ageCategoryId column to video table  
ALTER TABLE oky_id.video
ADD COLUMN IF NOT EXISTS "ageCategoryId" UUID REFERENCES oky_id.age_category(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_article_age_category ON oky_id.article("ageCategoryId");
CREATE INDEX IF NOT EXISTS idx_video_age_category ON oky_id.video("ageCategoryId");
CREATE INDEX IF NOT EXISTS idx_age_category_lang ON oky_id.age_category(lang);