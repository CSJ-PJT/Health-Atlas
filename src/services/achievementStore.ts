export interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

const BADGES_KEY = "earned_badges_v1";

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getEarnedBadges() {
  return readJson<EarnedBadge[]>(BADGES_KEY, []);
}

export function awardBadge(badge: Omit<EarnedBadge, "earnedAt">) {
  const badges = getEarnedBadges();
  if (badges.some((item) => item.id === badge.id)) {
    return badges;
  }
  const next = [...badges, { ...badge, earnedAt: new Date().toISOString() }];
  writeJson(BADGES_KEY, next);
  return next;
}
