import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { deepRepairLegacyValue } from "@/services/textRepair";

export type SnapshotScopeKey =
  | "feed_posts"
  | "feed_comments"
  | "social_friends"
  | "social_chat_rooms"
  | "social_chat_messages"
  | "entertainment_challenges"
  | "entertainment_scores"
  | "entertainment_rooms"
  | "profile_settings"
  | "earned_badges"
  | "verified_records"
  | "display_record_type";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export async function loadServerSnapshot<T>(scopeKey: SnapshotScopeKey | string): Promise<T | null> {
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

  return data?.payload ? deepRepairLegacyValue(data.payload as T) : null;
}

export async function saveServerSnapshot(scopeKey: SnapshotScopeKey | string, payload: unknown) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error } = await supabase.from("app_state_snapshots").upsert(
    {
      profile_id: profileId,
      scope_key: scopeKey,
      payload: payload as Json,
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
