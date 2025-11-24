-- Add Samsung Health connection fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS samsung_health_device_id TEXT,
ADD COLUMN IF NOT EXISTS samsung_health_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS samsung_health_last_sync_at TIMESTAMP WITH TIME ZONE;