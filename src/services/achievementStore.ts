import { supabase } from "@/integrations/supabase/client";
import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";

export interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

const BADGES_KEY = "earned_badges_v1";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export function getEarnedBadges() {
  return readScopedJson<EarnedBadge[]>(BADGES_KEY, []);
}

export function awardBadge(badge: Omit<EarnedBadge, "earnedAt">) {
  const badges = getEarnedBadges();
  if (badges.some((item) => item.id === badge.id)) {
    return badges;
  }
  const earnedBadge = { ...badge, earnedAt: new Date().toISOString() };
  const next = [...badges, earnedBadge];
  writeScopedJson(BADGES_KEY, next);
  void saveServerBadge(earnedBadge, next);
  return next;
}

export async function hydrateEarnedBadgesFromServer() {
  const badges = await loadServerBadges();
  if (Array.isArray(badges)) {
    writeScopedJson(BADGES_KEY, badges);
    return true;
  }

  const snapshotBadges = await loadServerSnapshot<EarnedBadge[]>("earned_badges");
  if (!Array.isArray(snapshotBadges)) {
    return false;
  }
  writeScopedJson(BADGES_KEY, snapshotBadges);
  return true;
}

async function saveServerBadge(badge: EarnedBadge, badges: EarnedBadge[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("user_earned_badges").upsert({
    id: `${profileId}:${badge.id}`,
    profile_id: profileId,
    badge_id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    earned_at: badge.earnedAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    void saveServerSnapshot("earned_badges", badges);
    return false;
  }

  return true;
}

async function loadServerBadges() {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase.from("user_earned_badges").select("*").eq("profile_id", profileId).order("earned_at", { ascending: false });
  if (error) {
    return null;
  }

  return (data || []).map(
    (row): EarnedBadge => ({
      id: row.badge_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      earnedAt: row.earned_at,
    }),
  );
}
