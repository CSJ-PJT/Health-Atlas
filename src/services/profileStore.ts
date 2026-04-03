export interface UserProfileSettings {
  userId: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  showSummary: boolean;
}

const PROFILE_SETTINGS_KEY = "user_profile_settings_v1";

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

export function getAllProfileSettings() {
  return readJson<Record<string, UserProfileSettings>>(PROFILE_SETTINGS_KEY, {});
}

export function getProfileSettings(userId: string, nickname?: string, avatarUrl?: string): UserProfileSettings {
  const all = getAllProfileSettings();
  return (
    all[userId] || {
      userId,
      nickname: nickname || localStorage.getItem("user_nickname") || "사용자",
      avatarUrl: avatarUrl || localStorage.getItem("user_avatar") || "",
      bio: "",
      showSummary: true,
    }
  );
}

export function saveProfileSettings(profile: UserProfileSettings) {
  const all = getAllProfileSettings();
  all[profile.userId] = profile;
  writeJson(PROFILE_SETTINGS_KEY, all);
}
