import { getEarnedBadges } from "@/services/achievementStore";
import { getFeedComments, getFeedPosts } from "@/services/feedStore";
import { getProfileSettings } from "@/services/profileStore";
import { createAuditLog } from "@/services/security/auditLogRepository";
import { clearPendingOpenAiCredentials } from "@/services/security/openAiCredentialStore";
import { removeSecret } from "@/services/security/secretStorage";
import { getChatMessages, getChatRooms, getFriends } from "@/services/socialStore";
import { getVerifiedRecords } from "@/services/verifiedRecordStore";

function scopedKeys() {
  const scopeId = localStorage.getItem("profile_id") || localStorage.getItem("user_id") || "guest";
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

export function downloadUserDataExport() {
  const data = buildUserDataExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rh-healthcare-export-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  void createAuditLog("사용자 데이터 내보내기 수행");
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
  void createAuditLog("로컬 사용자 데이터 삭제 수행");
}
