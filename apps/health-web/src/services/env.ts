export type HealthWebEnv = {
  projectId?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

export type HealthWebEnvStatus = HealthWebEnv & {
  hasProjectId: boolean;
  hasSupabaseUrl: boolean;
  hasPublishableKey: boolean;
  isSupabaseConfigured: boolean;
};

export function getHealthWebEnv(): HealthWebEnvStatus {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  const hasProjectId = Boolean(projectId);
  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasPublishableKey = Boolean(supabasePublishableKey);

  return {
    projectId,
    supabaseUrl,
    supabasePublishableKey,
    hasProjectId,
    hasSupabaseUrl,
    hasPublishableKey,
    isSupabaseConfigured: hasProjectId && hasSupabaseUrl && hasPublishableKey,
  };
}
