-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  user_id_changed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create openai_credentials table
CREATE TABLE public.openai_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT NOT NULL,
  project_id TEXT NOT NULL,
  thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transfer_logs table
CREATE TABLE public.transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (true);

-- RLS Policies for openai_credentials
CREATE POLICY "Users can view their own credentials"
  ON public.openai_credentials FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own credentials"
  ON public.openai_credentials FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own credentials"
  ON public.openai_credentials FOR UPDATE
  USING (true);

-- RLS Policies for transfer_logs
CREATE POLICY "Users can view their own logs"
  ON public.transfer_logs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own logs"
  ON public.transfer_logs FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_openai_credentials_updated_at
  BEFORE UPDATE ON public.openai_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_transfer_logs_profile_id ON public.transfer_logs(profile_id);
CREATE INDEX idx_transfer_logs_created_at ON public.transfer_logs(created_at DESC);
CREATE INDEX idx_openai_credentials_profile_id ON public.openai_credentials(profile_id);