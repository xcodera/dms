-- DANGER: This disables security temporarily to debug the issue. 
-- Run this in Supabase SQL Editor.

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Check if any data actually exists (result will appear in 'Results' tab)
SELECT * FROM public.profiles;
