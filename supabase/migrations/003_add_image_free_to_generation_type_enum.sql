-- Add 'image_free' to the generation_type enum
-- This handles the case where the enum already exists without 'image_free'

ALTER TYPE generation_type ADD VALUE 'image_free';

-- Note: This will fail if 'image_free' already exists, which is fine
-- ALTER TYPE ... ADD VALUE doesn't support IF NOT EXISTS in PostgreSQL