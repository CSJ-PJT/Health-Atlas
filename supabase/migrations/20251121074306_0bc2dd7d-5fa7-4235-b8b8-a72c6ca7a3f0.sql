-- Add steps_data column to health_data table
ALTER TABLE public.health_data 
ADD COLUMN IF NOT EXISTS steps_data jsonb;