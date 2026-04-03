import { supabase } from "@/integrations/supabase/client";
import { getSecret, hasSecret, removeSecret, setSecret } from "@/services/security/secretStorage";

const OPENAI_API_KEY_SECRET = "openai_api_key_secret";
const OPENAI_PROJECT_ID_SECRET = "openai_project_id_secret";

export function savePendingOpenAiCredentials(apiKey: string, projectId: string) {
  setSecret(OPENAI_API_KEY_SECRET, apiKey);
  setSecret(OPENAI_PROJECT_ID_SECRET, projectId);
}

export function clearPendingOpenAiCredentials() {
  removeSecret(OPENAI_API_KEY_SECRET);
  removeSecret(OPENAI_PROJECT_ID_SECRET);
}

export function getPendingOpenAiCredentials() {
  return {
    apiKey: getSecret(OPENAI_API_KEY_SECRET),
    projectId: getSecret(OPENAI_PROJECT_ID_SECRET),
  };
}

export function hasPendingOpenAiCredentials() {
  return hasSecret(OPENAI_API_KEY_SECRET) && hasSecret(OPENAI_PROJECT_ID_SECRET);
}

export async function getResolvedOpenAiCredentials() {
  const pending = getPendingOpenAiCredentials();
  if (pending.apiKey) {
    return pending;
  }

  const profileId = localStorage.getItem("profile_id");
  if (!profileId) {
    return { apiKey: "", projectId: "" };
  }

  const { data, error } = await supabase
    .from("openai_credentials")
    .select("api_key, project_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data?.api_key) {
    return { apiKey: "", projectId: "" };
  }

  savePendingOpenAiCredentials(data.api_key, data.project_id || "");
  return {
    apiKey: data.api_key,
    projectId: data.project_id || "",
  };
}
