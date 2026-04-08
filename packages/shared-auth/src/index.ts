export function getStoredUserId() {
  return localStorage.getItem("user_id") || "me";
}

export function getStoredProfileId() {
  return localStorage.getItem("profile_id");
}
