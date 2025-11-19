-- Safe way to add 'image_free' to existing enum
-- Check current enum values first
SELECT unnest(enum_range(NULL::generation_type));

-- Add 'image_free' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'generation_type')
        AND enumlabel = 'image_free'
    ) THEN
        ALTER TYPE generation_type ADD VALUE 'image_free';
    END IF;
END
$$;