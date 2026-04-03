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

export function getEarnedBadges() {
  return readScopedJson<EarnedBadge[]>(BADGES_KEY, []);
}

export function awardBadge(badge: Omit<EarnedBadge, "earnedAt">) {
  const badges = getEarnedBadges();
  if (badges.some((item) => item.id === badge.id)) {
    return badges;
  }
  const next = [...badges, { ...badge, earnedAt: new Date().toISOString() }];
  writeScopedJson(BADGES_KEY, next);
  void saveServerSnapshot("earned_badges", next);
  return next;
}

export async function hydrateEarnedBadgesFromServer() {
  const badges = await loadServerSnapshot<EarnedBadge[]>("earned_badges");
  if (!Array.isArray(badges)) {
    return false;
  }
  writeScopedJson(BADGES_KEY, badges);
  return true;
}
