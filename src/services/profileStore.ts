import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";

export interface UserProfileSettings {
  userId: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  showSummary: boolean;
}

const PROFILE_SETTINGS_KEY = "user_profile_settings_v1";

function buildInitials(name: string) {
  return name.slice(0, 1).toUpperCase() || "U";
}

function buildPlaceholderAvatar(name: string, userId: string) {
  const hue = Array.from(userId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="48" fill="hsl(${hue} 62% 88%)"/>
      <circle cx="128" cy="98" r="40" fill="hsl(${hue} 46% 58%)"/>
      <path d="M56 214c14-38 44-58 72-58s58 20 72 58" fill="hsl(${hue} 46% 58%)"/>
      <text x="128" y="144" text-anchor="middle" fill="hsl(${hue} 44% 26%)" font-size="60" font-family="Arial" font-weight="700">${buildInitials(
        name,
      )}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getAllProfileSettings() {
  return readScopedJson<Record<string, UserProfileSettings>>(PROFILE_SETTINGS_KEY, {});
}

export function getProfileSettings(
  userId: string,
  nickname?: string,
  avatarUrl?: string,
  options?: { isCurrentUser?: boolean },
): UserProfileSettings {
  const all = getAllProfileSettings();
  if (all[userId]) {
    return all[userId];
  }

  const safeName =
    nickname || (options?.isCurrentUser ? localStorage.getItem("user_nickname") || "사용자" : userId || "사용자");
  const safeAvatar =
    avatarUrl ||
    (options?.isCurrentUser ? localStorage.getItem("user_avatar") || "" : buildPlaceholderAvatar(safeName, userId));

  return {
    userId,
    nickname: safeName,
    avatarUrl: safeAvatar,
    bio: "",
    showSummary: true,
  };
}

export function saveProfileSettings(profile: UserProfileSettings) {
  const all = getAllProfileSettings();
  all[profile.userId] = profile;
  writeScopedJson(PROFILE_SETTINGS_KEY, all);
}
