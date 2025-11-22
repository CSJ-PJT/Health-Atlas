-- Revert the NOT NULL constraint on user_id column
-- This allows user_id to be nullable again
ALTER TABLE public.health_data 
ALTER COLUMN user_id DROP NOT NULL;