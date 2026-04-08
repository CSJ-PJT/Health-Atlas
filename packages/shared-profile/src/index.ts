export type SharedProfileSummary = {
  profileId: string | null;
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
};

export function readSharedProfileSummary(): SharedProfileSummary {
  return {
    profileId: localStorage.getItem("profile_id"),
    userId: localStorage.getItem("user_id") || "me",
    nickname: localStorage.getItem("user_nickname") || "사용자",
    avatarUrl: localStorage.getItem("user_avatar_url"),
  };
}
