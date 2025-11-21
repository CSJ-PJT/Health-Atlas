-- Create health_data table to store Samsung Health data
CREATE TABLE public.health_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exercise_data JSONB,
  running_data JSONB,
  sleep_data JSONB,
  body_composition_data JSONB,
  nutrition_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_health_data_synced_at ON public.health_data(synced_at DESC);

-- Enable Row Level Security
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read (since there's no user auth)
CREATE POLICY "Allow public read access" 
ON public.health_data 
FOR SELECT 
USING (true);

-- Create policy to allow service role to insert
CREATE POLICY "Allow service role to insert" 
ON public.health_data 
FOR INSERT 
WITH CHECK (true);