import type { AppleHealthProviderConfig } from "@/providers/apple/types/apple";

const APPLE_APP_ID_KEY = "apple_health_app_id";
const APPLE_TEAM_ID_KEY = "apple_health_team_id";
const APPLE_REDIRECT_URI_KEY = "apple_health_redirect_uri";
const APPLE_API_BASE_URL_KEY = "apple_health_api_base_url";
const APPLE_ACCESS_TOKEN_KEY = "apple_health_access_token";

export function getAppleHealthProviderConfig(): AppleHealthProviderConfig {
  return {
    appId: localStorage.getItem(APPLE_APP_ID_KEY)?.trim() || "",
    teamId: localStorage.getItem(APPLE_TEAM_ID_KEY)?.trim() || "",
    redirectUri: localStorage.getItem(APPLE_REDIRECT_URI_KEY)?.trim() || "",
    apiBaseUrl: localStorage.getItem(APPLE_API_BASE_URL_KEY)?.trim() || "",
    accessToken: localStorage.getItem(APPLE_ACCESS_TOKEN_KEY)?.trim() || "",
  };
}

export function setAppleHealthProviderConfig(config: AppleHealthProviderConfig) {
  localStorage.setItem(APPLE_APP_ID_KEY, config.appId.trim());
  localStorage.setItem(APPLE_TEAM_ID_KEY, config.teamId.trim());
  localStorage.setItem(APPLE_REDIRECT_URI_KEY, config.redirectUri.trim());
  localStorage.setItem(APPLE_API_BASE_URL_KEY, config.apiBaseUrl?.trim() || "");
  localStorage.setItem(APPLE_ACCESS_TOKEN_KEY, config.accessToken?.trim() || "");
}

export function hasAppleHealthProviderConfig() {
  const config = getAppleHealthProviderConfig();
  return Boolean(config.appId && config.teamId && config.redirectUri);
}

export function hasAppleHealthBridgeConfig() {
  const config = getAppleHealthProviderConfig();
  return Boolean(config.apiBaseUrl && config.accessToken);
}
