-- Disable RLS on health_data table to prevent authentication redirects in native app
ALTER TABLE public.health_data DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on health_data table
DROP POLICY IF EXISTS "Users can view their own health data" ON public.health_data;
DROP POLICY IF EXISTS "Users can insert their own health data" ON public.health_data;
DROP POLICY IF EXISTS "Users can update their own health data" ON public.health_data;
DROP POLICY IF EXISTS "Users can delete their own health data" ON public.health_data;