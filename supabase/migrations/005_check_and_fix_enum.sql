-- Check current enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'generation_type')
ORDER BY enumsortorder;

-- Check if enum type exists
SELECT typname FROM pg_type WHERE typname = 'generation_type';

-- Check if generations table exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'generations' AND column_name = 'generation_type';