-- Make user_id NOT NULL to prevent orphaned health records
-- First, we need to handle any existing NULL values (if any)
-- Delete any records without a user_id as they cannot be properly protected
DELETE FROM public.health_data WHERE user_id IS NULL;

-- Now add the NOT NULL constraint
ALTER TABLE public.health_data 
ALTER COLUMN user_id SET NOT NULL;