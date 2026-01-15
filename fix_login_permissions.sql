-- Copy everything below and paste it into your Supabase Dashboard -> SQL Editor
-- Then click "RUN"

-- 1. Ensure the 'profiles' table has the necessary columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS alias TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. DROP existing policies that might conflict (optional, to be safe)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 4. Create proper policies

-- ALLOW PUBLIC READ: Required for Login Page to find username without being logged in
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING ( true );

-- ALLOW INSERT: Required for Registration to create the profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- ALLOW UPDATE: Required for users to update their data
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- 5. (Optional) Create an index for faster username lookup
CREATE INDEX IF NOT EXISTS profiles_alias_idx ON public.profiles (alias);
