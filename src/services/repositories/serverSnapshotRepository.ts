import { supabase } from "@/integrations/supabase/client";

export type SnapshotScopeKey =
  | "feed_posts"
  | "feed_comments"
  | "social_friends"
  | "social_chat_rooms"
  | "social_chat_messages"
  | "profile_settings"
  | "earned_badges"
  | "verified_records"
  | "display_record_type";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export async function loadServerSnapshot<T>(scopeKey: SnapshotScopeKey): Promise<T | null> {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_state_snapshots")
    .select("payload")
    .eq("profile_id", profileId)
    .eq("scope_key", scopeKey)
    .maybeSingle();

  if (error) {
    console.warn(`Failed to load snapshot for ${scopeKey}:`, error.message);
    return null;
  }

  return (data?.payload as T | null) ?? null;
}

export async function saveServerSnapshot(scopeKey: SnapshotScopeKey, payload: unknown) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error } = await supabase.from("app_state_snapshots").upsert(
    {
      profile_id: profileId,
      scope_key: scopeKey,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,scope_key" },
  );

  if (error) {
    console.warn(`Failed to save snapshot for ${scopeKey}:`, error.message);
    return false;
  }

  return true;
}
