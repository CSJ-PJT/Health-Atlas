-- Add user_id column to health_data table for user isolation
ALTER TABLE public.health_data 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_health_data_user_id ON public.health_data(user_id);

-- Drop the existing public read access policy
DROP POLICY IF EXISTS "Allow public read access" ON public.health_data;

-- Drop the service role insert policy (we'll create a better one)
DROP POLICY IF EXISTS "Allow service role to insert" ON public.health_data;

-- Create user-specific RLS policies
-- Users can only view their own health data
CREATE POLICY "Users can view their own health data"
ON public.health_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own health data
CREATE POLICY "Users can insert their own health data"
ON public.health_data
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own health data
CREATE POLICY "Users can update their own health data"
ON public.health_data
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own health data
CREATE POLICY "Users can delete their own health data"
ON public.health_data
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to insert data on behalf of users (for backend sync)
CREATE POLICY "Service role can insert health data"
ON public.health_data
FOR INSERT
TO service_role
WITH CHECK (true);