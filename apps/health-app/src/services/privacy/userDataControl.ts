import { supabase } from "@/integrations/supabase/client";
import { getEarnedBadges } from "@/services/achievementStore";
import { getFeedComments, getFeedPosts } from "@/services/feedStore";
import { getProfileSettings } from "@/services/profileStore";
import { loadServerSnapshot } from "@/services/repositories/serverSnapshotRepository";
import { createAuditLog } from "@/services/security/auditLogRepository";
import { clearPendingOpenAiCredentials } from "@/services/security/openAiCredentialStore";
import { removeSecret } from "@/services/security/secretStorage";
import { getChatMessages, getChatRooms, getFriends } from "@/services/socialStore";
import { getVerifiedRecords } from "@/services/verifiedRecordStore";

function getScopeId() {
  return localStorage.getItem("profile_id") || localStorage.getItem("user_id") || "guest";
}

function getProfileId() {
  return localStorage.getItem("profile_id");
}

function scopedKeys() {
  const scopeId = getScopeId();
  return [
    `social_feed_posts_v5::${scopeId}`,
    `social_feed_comments_v3::${scopeId}`,
    `social_friends::${scopeId}`,
    `social_chat_rooms::${scopeId}`,
    `social_chat_messages::${scopeId}`,
    `user_profile_settings_v1::${scopeId}`,
    `earned_badges_v1::${scopeId}`,
    `verified_records_v1::${scopeId}`,
    `profile_display_record_type_v1::${scopeId}`,
  ];
}

export function buildUserDataExport() {
  const userId = localStorage.getItem("user_id") || "guest";
  return {
    exportedAt: new Date().toISOString(),
    source: "local",
    userId,
    profile: getProfileSettings(userId),
    feed: {
      posts: getFeedPosts(),
      comments: getFeedComments(),
    },
    social: {
      friends: getFriends(),
      rooms: getChatRooms(),
      messages: getChatMessages(),
    },
    achievements: getEarnedBadges(),
    verifiedRecords: getVerifiedRecords(),
  };
}

export async function buildServerUserDataExport() {
  const profileId = getProfileId();
  if (!profileId) {
    return buildUserDataExport();
  }

  const [
    profileSettings,
    profilePreferences,
    badges,
    verifiedRecords,
    posts,
    comments,
    friends,
    rooms,
    messages,
    snapshots,
    healthData,
    requests,
  ] = await Promise.all([
    supabase.from("user_profile_settings").select("*").eq("profile_id", profileId),
    supabase.from("user_profile_preferences").select("*").eq("profile_id", profileId),
    supabase.from("user_earned_badges").select("*").eq("profile_id", profileId),
    supabase.from("user_verified_records").select("*").eq("profile_id", profileId),
    supabase.from("social_feed_posts").select("*").eq("profile_id", profileId),
    supabase.from("social_feed_comments").select("*").eq("profile_id", profileId),
    supabase.from("social_friends").select("*").eq("profile_id", profileId),
    supabase.from("social_chat_rooms").select("*").eq("profile_id", profileId),
    supabase.from("social_chat_messages").select("*").eq("profile_id", profileId),
    supabase.from("app_state_snapshots").select("*").eq("profile_id", profileId),
    supabase.from("health_data").select("*").eq("user_id", localStorage.getItem("user_id") || ""),
    supabase.from("data_subject_requests" as never).select("*").eq("profile_id", profileId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    source: "server",
    profileId,
    userId: localStorage.getItem("user_id") || "guest",
    profileSettings: profileSettings.data || [],
    profilePreferences: profilePreferences.data || [],
    badges: badges.data || [],
    verifiedRecords: verifiedRecords.data || [],
    feed: {
      posts: posts.data || [],
      comments: comments.data || [],
    },
    social: {
      friends: friends.data || [],
      rooms: rooms.data || [],
      messages: messages.data || [],
    },
    healthData: healthData.data || [],
    requests: requests.data || [],
    snapshots: snapshots.data || [],
  };
}

function triggerJsonDownload(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadUserDataExport() {
  const data = buildUserDataExport();
  triggerJsonDownload(`rh-healthcare-export-local-${Date.now()}.json`, data);
  void createAuditLog("로컬 사용자 데이터 내보내기 수행", "success", "export", { source: "local" });
}

export async function downloadServerUserDataExport() {
  const data = await buildServerUserDataExport();
  triggerJsonDownload(`rh-healthcare-export-server-${Date.now()}.json`, data);
  void createAuditLog("서버 사용자 데이터 내보내기 수행", "success", "export", { source: "server" });
}

export function deleteScopedUserData() {
  scopedKeys().forEach((key) => localStorage.removeItem(key));
  clearPendingOpenAiCredentials();
  [
    "garmin_access_token",
    "apple_health_access_token",
    "strava_client_secret",
    "strava_refresh_token",
    "kakao_auth_config_client_secret",
    "line_auth_config_client_secret",
    "kakao_access_token",
    "kakao_refresh_token",
  ].forEach(removeSecret);
  void createAuditLog("로컬 사용자 데이터 삭제 수행", "success", "deletion", { scope: "local" });
}

export async function deleteServerUserData() {
  const profileId = getProfileId();
  const userId = localStorage.getItem("user_id") || "";
  if (!profileId) {
    deleteScopedUserData();
    return false;
  }

  const tasks = [
    supabase.from("social_chat_messages").delete().eq("profile_id", profileId),
    supabase.from("social_chat_rooms").delete().eq("profile_id", profileId),
    supabase.from("social_friends").delete().eq("profile_id", profileId),
    supabase.from("social_feed_comments").delete().eq("profile_id", profileId),
    supabase.from("social_feed_posts").delete().eq("profile_id", profileId),
    supabase.from("user_earned_badges").delete().eq("profile_id", profileId),
    supabase.from("user_verified_records").delete().eq("profile_id", profileId),
    supabase.from("user_profile_preferences").delete().eq("profile_id", profileId),
    supabase.from("user_profile_settings").delete().eq("profile_id", profileId),
    supabase.from("app_state_snapshots").delete().eq("profile_id", profileId),
    supabase.from("openai_credentials").delete().eq("profile_id", profileId),
    supabase.from("health_data").delete().eq("user_id", userId),
  ];

  const results = await Promise.all(tasks);
  const hasError = results.some((result) => Boolean(result.error));
  if (hasError) {
    void createAuditLog("서버 사용자 데이터 삭제 실패", "error", "deletion", {
      profileId,
      errors: results.filter((result) => result.error).length,
    });
    return false;
  }

  deleteScopedUserData();
  void createAuditLog("서버 사용자 데이터 삭제 수행", "success", "deletion", { profileId });
  return true;
}

export async function submitServerDeletionRequest(details = "사용자가 서버 데이터 삭제 요청을 제출했습니다.") {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error } = await supabase.from("data_subject_requests" as never).insert({
    profile_id: profileId,
    request_type: "erasure",
    status: "requested",
    details,
  } as never);

  if (error) {
    void createAuditLog("데이터 삭제 요청 제출 실패", "error", "privacy", { profileId, details });
    return false;
  }

  void createAuditLog("데이터 삭제 요청 제출", "success", "privacy", { profileId, details });
  return true;
}

export async function loadServerDeletionRequests() {
  const profileId = getProfileId();
  if (!profileId) {
    return [];
  }

  const { data, error } = await supabase
    .from("data_subject_requests" as never)
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}

export async function loadServerAuditEvents() {
  const profileId = getProfileId();
  if (!profileId) {
    return [];
  }

  const { data, error } = await supabase
    .from("app_audit_events" as never)
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return [];
  }

  return data || [];
}

export async function loadSnapshotFallback(scopeKey: string) {
  return loadServerSnapshot(scopeKey as Parameters<typeof loadServerSnapshot>[0]);
}
