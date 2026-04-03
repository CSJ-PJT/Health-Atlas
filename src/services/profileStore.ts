import { supabase } from "@/integrations/supabase/client";
import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";

export interface UserProfileSettings {
  userId: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  showSummary: boolean;
  showBadges: boolean;
  showPersonalFeed: boolean;
}

const PROFILE_SETTINGS_KEY = "user_profile_settings_v1";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

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
    showBadges: true,
    showPersonalFeed: true,
  };
}

export function saveProfileSettings(profile: UserProfileSettings) {
  const all = getAllProfileSettings();
  all[profile.userId] = profile;
  writeScopedJson(PROFILE_SETTINGS_KEY, all);
  void saveServerProfileSettings(profile);
}

export async function hydrateProfileSettingsFromServer() {
  const settings = await loadServerProfileSettings();
  if (settings) {
    writeScopedJson(PROFILE_SETTINGS_KEY, settings);
    return true;
  }

  const all = await loadServerSnapshot<Record<string, UserProfileSettings>>("profile_settings");
  if (!all) {
    return false;
  }
  writeScopedJson(PROFILE_SETTINGS_KEY, all);
  return true;
}

async function saveServerProfileSettings(profile: UserProfileSettings) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const all = getAllProfileSettings();
  const { error } = await supabase.from("user_profile_settings").upsert({
    id: `${profileId}:${profile.userId}`,
    profile_id: profileId,
    user_id: profile.userId,
    nickname: profile.nickname,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
    show_summary: profile.showSummary,
    show_badges: profile.showBadges,
    show_personal_feed: profile.showPersonalFeed,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    void saveServerSnapshot("profile_settings", all);
    return false;
  }

  return true;
}

async function loadServerProfileSettings() {
  const { data, error } = await supabase.from("user_profile_settings").select("*");
  if (error) {
    return null;
  }

  return (data || []).reduce<Record<string, UserProfileSettings>>((acc, row) => {
    acc[row.user_id] = {
      userId: row.user_id,
      nickname: row.nickname,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      showSummary: row.show_summary,
      showBadges: row.show_badges ?? true,
      showPersonalFeed: row.show_personal_feed ?? true,
    };
    return acc;
  }, {});
}
