-- Create generations table for tracking AI generation jobs
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- This will store the Clerk user ID
  prompt TEXT NOT NULL,
  generation_type generation_type NOT NULL DEFAULT 'image',
  status job_status NOT NULL DEFAULT 'pending',
  job_id_external TEXT, -- ID from external API (Kie.ai, Pollinations, etc.)
  result_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update profiles table to include credits and clerk_id
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL, -- This will store the Clerk user ID
  email TEXT,
  credits INTEGER DEFAULT 0,
  bio TEXT,
  website TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Define the enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_type') THEN
        CREATE TYPE generation_type AS ENUM ('text_to_prompt', 'image', 'video', 'image_free');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
END
$$;

-- Enable Row Level Security on generations table
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generations table
-- Users can only read their own generations
CREATE POLICY "Users can read own generations" ON public.generations
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

-- Users can only insert their own generations
CREATE POLICY "Users can insert own generations" ON public.generations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Users can only update their own generations
CREATE POLICY "Users can update own generations" ON public.generations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Users can only delete their own generations
CREATE POLICY "Users can delete own generations" ON public.generations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- RLS Policies for profiles table
-- Users can read public profiles or their own profile
CREATE POLICY "Users can read public profiles or own profile" ON public.profiles
  FOR SELECT USING (
    is_public = true OR auth.jwt() ->> 'sub' = clerk_id
  );

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON public.generations(generation_type);
CREATE INDEX IF NOT EXISTS idx_generations_status ON public.generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON public.profiles(clerk_id);
CREATE INDEX IF NOT EXISTS idx_profiles_credits ON public.profiles(credits);

-- Create updated_at trigger for generations table
CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON public.generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for profiles table (if not exists)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();